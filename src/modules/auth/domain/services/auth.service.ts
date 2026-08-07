import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtAuthService } from './jwt.service';
import type { JwtPayload, AuthTokenResponse } from '../ports/in/jwt-service.port';
import type {
  IAuthService,
  LoginDto,
  RefreshTokenDto,
  AuthResponse,
} from '../ports/in/auth-service.port';
import { PasswordService } from '../../../users/domain/services/password.service';
import { GetUserUseCase } from '../../../users/application/use-cases/get-user.usecase';
import { UpdateUserUseCase } from '../../../users/application/use-cases/update-user.usecase';
import type { User } from '../../../users/domain/entities/user.entity';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { Types } from 'mongoose';

@Injectable()
export class AuthService implements IAuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtAuthService: JwtAuthService,
    private readonly passwordService: PasswordService,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly traceService: TraceService,
  ) {}

  async login(dto: LoginDto, tracking: TrackingContext): Promise<AuthResponse> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'AuthService.login', {
      username: dto.username,
    });

    const user = await this.getUserUseCase.executeByUsername(dto.username, tracking);
    if (!user) {
      throw new UnauthorizedException('El email o nombre de usuario no existe');
    }

    if (!user.password) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValida = await this.passwordService.comparePassword(
      dto.password,
      user.password,
    );
    if (!passwordValida) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    await this.updateUserUseCase.updateLastLogin(user.id, tracking);

    const tokens = await this.jwtAuthService.generateTokens(user);
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'AuthService.login - éxito', {
      id: user.id,
    });

    const { password: _password, ...userSinPassword } = user;
    void _password;
    return {
      user: userSinPassword,
      ...tokens,
    };
  }

  async refreshToken(
    refreshToken: string,
    tracking: TrackingContext,
  ): Promise<AuthTokenResponse> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'AuthService.refreshToken');

    const decoded = this.jwtAuthService.verifyRefreshToken(refreshToken);

    if (!decoded.sub || !this.isValidObjectId(decoded.sub)) {
      this.logger.warn('Token inválido o sin sub claim');
      throw new UnauthorizedException('Token inválido');
    }

    const user = await this.getUserUseCase.execute(decoded.sub, tracking);
    const tokens = await this.jwtAuthService.generateTokens(user);
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'AuthService.refreshToken - éxito', {
      email: user.email,
    });

    return tokens;
  }

  async getProfile(
    userId: string,
    tracking: TrackingContext,
  ): Promise<Omit<User, 'password'>> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'AuthService.getProfile', {
      userId,
    });

    const user = await this.getUserUseCase.execute(userId, tracking);
    const { password: _password, ...profile } = user;
    void _password;
    return profile;
  }

  async validateUser(payload: JwtPayload): Promise<User | null> {
    const tracking: TrackingContext = {
      trackingId: `jwt-validate-${payload.sub}`,
      sessionId: '',
    };

    try {
      return await this.getUserUseCase.execute(payload.sub, tracking);
    } catch (error) {
      this.logger.error('Error al validar usuario del JWT', error);
      return null;
    }
  }

  private isValidObjectId(id: string): boolean {
    return Types.ObjectId.isValid(id);
  }
}
