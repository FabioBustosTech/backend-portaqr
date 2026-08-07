import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService as JwtServiceCore } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import type { IJwtService, JwtPayload, AuthTokenResponse } from '../ports/in/jwt-service.port';
import type { User } from '../../../users/domain/entities/user.entity';

@Injectable()
export class JwtAuthService implements IJwtService {
  private readonly logger = new Logger(JwtAuthService.name);

  constructor(
    private readonly jwtService: JwtServiceCore,
    private readonly configService: ConfigService,
  ) {}

  async generateTokens(user: User): Promise<AuthTokenResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      userName: user.userName,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRATION') as StringValue,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION') as StringValue,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  verifyToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch (error) {
      this.logger.error('Error al verificar el token', error);
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  verifyRefreshToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        algorithms: ['HS256'],
      });
    } catch (error) {
      this.logger.error('Error al verificar refresh token', error);
      throw new UnauthorizedException('Token de refresco inválido o expirado');
    }
  }

  decodeToken(token: string): JwtPayload | null {
    try {
      return this.jwtService.decode(token);
    } catch (error) {
      this.logger.error('Error al decodificar el token', error);
      return null;
    }
  }
}
