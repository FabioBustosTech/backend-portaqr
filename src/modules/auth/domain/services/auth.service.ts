import { Injectable, UnauthorizedException, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthService } from './jwt.service';
import type { JwtPayload, AuthTokenResponse } from '../ports/in/jwt-service.port';
import type { IAuthService, LoginDto, AuthResponse } from '../ports/in/auth-service.port';
import { PasswordService } from '../../../users/domain/services/password.service';
import { GetUserUseCase } from '../../../users/application/use-cases/get-user.usecase';
import { UpdateUserUseCase } from '../../../users/application/use-cases/update-user.usecase';
import { IncrementTokenVersionUseCase } from '../../../users/application/use-cases/increment-token-version.usecase';
import type { User } from '../../../users/domain/entities/user.entity';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { Types } from 'mongoose';
import { REFRESH_TOKEN_STORE_PORT } from '../constants/auth.tokens';
import type { IRefreshTokenStore } from '../ports/refresh-token.port';
import { sha256Hex } from '../../../../common/utils/hash.util';

@Injectable()
export class AuthService implements IAuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtAuthService: JwtAuthService,
    private readonly passwordService: PasswordService,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly incrementTokenVersionUseCase: IncrementTokenVersionUseCase,
    private readonly traceService: TraceService,
    private readonly configService: ConfigService,
    @Inject(REFRESH_TOKEN_STORE_PORT)
    private readonly refreshTokenStore: IRefreshTokenStore,
  ) {}

  async login(dto: LoginDto, tracking: TrackingContext): Promise<AuthResponse> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'AuthService.login', {
      username: dto.username,
    });

    const user = await this.getUserUseCase.executeByUsername(dto.username, tracking);

    // SPEC-009 A4: mensaje homogéneo — no revelar si la cuenta existe
    // (mismo mensaje y mismo status para usuario inexistente y contraseña incorrecta)
    if (!user || !user.password) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValida = await this.passwordService.comparePassword(
      dto.password,
      user.password,
    );
    if (!passwordValida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.updateUserUseCase.updateLastLogin(user.id, tracking);

    const tokens = await this.jwtAuthService.generateTokens(user);
    // SPEC-009 A8: persistir el refresh token (hash) al emitirlo
    await this.persistRefreshToken(user.id, tokens.refreshToken, tracking);

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

    // Si el refresh token fue emitido con una versión anterior a la actual,
    // fue invalidado (logout) y no puede usarse para renovar sesión.
    if ((decoded.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
      this.logger.warn(
        `Refresh token invalidado (tokenVersion desactualizado) para user ${user.id}`,
      );
      throw new UnauthorizedException('Token de refresco inválido o expirado');
    }

    // SPEC-009 A8: el refresh debe existir en la colección (emitido por nosotros)
    const tokenHash = sha256Hex(refreshToken);
    const stored = await this.refreshTokenStore.findByHash(tokenHash, tracking);

    if (!stored) {
      this.logger.warn(`Refresh token no registrado (hash no encontrado) para user ${user.id}`);
      throw new UnauthorizedException('Token de refresco inválido o expirado');
    }

    if (stored.revokedAt) {
      // SPEC-009 A8: REUSO de un token ya rotado → señal de robo →
      // revocar TODA la familia (tokenVersion++) y responder 401
      this.logger.warn(
        `Reuso de refresh token revocado (posible robo) para user ${user.id} — revocando familia`,
      );
      await this.incrementTokenVersionUseCase.execute(user.id, tracking);
      await this.refreshTokenStore.revokeAllByUser(user.id, tracking);
      throw new UnauthorizedException('Token de refresco inválido o expirado');
    }

    // SPEC-009 A8: rotación — revocar el actual y emitir uno nuevo
    await this.refreshTokenStore.revokeByHash(tokenHash, tracking);

    const tokens = await this.jwtAuthService.generateTokens(user);
    await this.persistRefreshToken(user.id, tokens.refreshToken, tracking);

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

  async logout(
    userId: string,
    tracking: TrackingContext,
  ): Promise<{ success: boolean }> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'AuthService.logout', {
      userId,
    });

    // Incrementar tokenVersion invalida todos los tokens JWT emitidos previamente
    await this.incrementTokenVersionUseCase.execute(userId, tracking);
    // SPEC-009 A8: revocar los refresh tokens activos del usuario
    await this.refreshTokenStore.revokeAllByUser(userId, tracking);
    return { success: true };
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

  /** SPEC-009 A8: persiste el hash del refresh token con expiración (TTL 7d configurable). */
  private async persistRefreshToken(
    userId: string,
    refreshToken: string,
    tracking: TrackingContext,
  ): Promise<void> {
    const ttlDays = parseInt(this.configService.get('REFRESH_TOKEN_TTL_DAYS') ?? '7', 10) || 7;
    await this.refreshTokenStore.create(
      {
        userId,
        tokenHash: sha256Hex(refreshToken),
        expiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000),
      },
      tracking,
    );
  }

  private isValidObjectId(id: string): boolean {
    return Types.ObjectId.isValid(id);
  }
}
