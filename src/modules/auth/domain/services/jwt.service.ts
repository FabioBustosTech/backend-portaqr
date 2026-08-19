import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService as JwtServiceCore } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import type { IJwtService, JwtPayload, AuthTokenResponse } from '../ports/in/jwt-service.port';
import type { User } from '../../../users/domain/entities/user.entity';
import { loadJwtKeys } from '../../infrastructure/jwt-keys';

@Injectable()
export class JwtAuthService implements IJwtService {
  private readonly logger = new Logger(JwtAuthService.name);

  constructor(
    private readonly jwtService: JwtServiceCore,
    private readonly configService: ConfigService,
  ) {
    // SPEC-009 A6: validación temprana en bootstrap — si NODE_ENV=production y
    // faltan las llaves, el proceso NO arranca (throw dentro de loadJwtKeys).
    loadJwtKeys(this.configService);
  }

  async generateTokens(user: User): Promise<AuthTokenResponse> {
    const { privateKey } = loadJwtKeys(this.configService);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      userName: user.userName,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      tokenVersion: user.tokenVersion ?? 0,
      // SPEC-020 RF-9: el frontend necesita provider/hasPassword para decidir
      // si muestra "Agregar contraseña" (Google sin contraseña) o "Cambio de
      // Contraseña" (ADR-020.7). Viajan en el JWT (claims frescos en cada login).
      provider: user.provider ?? 'local',
      hasPassword: user.hasPassword ?? true,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        privateKey,
        algorithm: 'RS256',
        expiresIn: this.configService.get<string>('JWT_EXPIRATION') as StringValue,
      }),
      this.jwtService.signAsync(payload, {
        privateKey,
        algorithm: 'RS256',
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION') as StringValue,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  verifyToken(token: string): JwtPayload {
    try {
      const { publicKey } = loadJwtKeys(this.configService);
      return this.jwtService.verify<JwtPayload>(token, {
        publicKey,
        algorithms: ['RS256'],
      });
    } catch (error) {
      this.logger.error('Error al verificar el token', error);
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  verifyRefreshToken(token: string): JwtPayload {
    try {
      const { publicKey } = loadJwtKeys(this.configService);
      return this.jwtService.verify<JwtPayload>(token, {
        publicKey,
        algorithms: ['RS256'],
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
