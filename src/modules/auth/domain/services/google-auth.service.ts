import { Injectable, Inject, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { JwtAuthService } from './jwt.service';
import type { AuthResponse } from '../ports/in/auth-service.port';
import type { IGoogleAuthService, GoogleProfile, GoogleAuthMode } from '../ports/in/google-auth-service.port';
import { PasswordService } from '../../../users/domain/services/password.service';
import { GetUserUseCase } from '../../../users/application/use-cases/get-user.usecase';
import { CreateUserUseCase } from '../../../users/application/use-cases/create-user.usecase';
import { UpdateUserUseCase } from '../../../users/application/use-cases/update-user.usecase';
import { CreateUserDto } from '../../../users/application/dto/create-user.dto';
import type { User } from '../../../users/domain/entities/user.entity';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { REFRESH_TOKEN_STORE_PORT, AUTH_EMAIL_PORT } from '../constants/auth.tokens';
import type { IRefreshTokenStore } from '../ports/refresh-token.port';
import type { ICanSendWelcomeEmail } from '../ports/out/email-sender.port';
import { sha256Hex } from '../../../../common/utils/hash.util';

/**
 * SPEC-020 RF-8: servicio de autenticación con Google.
 * Implementa IGoogleAuthService (patrón IAuthService/AUTH_SERVICE_PORT).
 * - email NO existe → crea cuenta (provider 'google', isEmailVerified true, password hash aleatorio — ADR-020.7)
 * - email existe → vincula googleId (sin tocar password/role — ADR-020.4)
 * - primer login (cuenta creada) → welcomeEmail best-effort (RF-23/RF-27)
 */
@Injectable()
export class GoogleAuthService implements IGoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);

  constructor(
    private readonly getUserUseCase: GetUserUseCase,
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly jwtAuthService: JwtAuthService,
    private readonly passwordService: PasswordService,
    private readonly traceService: TraceService,
    private readonly configService: ConfigService,
    @Inject(REFRESH_TOKEN_STORE_PORT)
    private readonly refreshTokenStore: IRefreshTokenStore,
    @Inject(AUTH_EMAIL_PORT)
    private readonly welcomeEmailSender: ICanSendWelcomeEmail,
  ) {}

  async authenticate(
    profile: GoogleProfile,
    mode: GoogleAuthMode,
    tracking: TrackingContext,
  ): Promise<AuthResponse> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'GoogleAuthService.authenticate', {
      email: profile.email,
      mode,
    });

    // 1. Buscar por email (RF-8.2)
    let user = await this.getUserUseCase.executeByEmail(profile.email, tracking);
    let cuentaCreada = false;

    if (!user) {
      // SPEC-020: en modo 'login' NO se crea cuenta — el usuario debe registrarse
      // primero (aceptando términos en /signup). El frontend redirige a /signup.
      if (mode === 'login') {
        this.traceService.warn(tracking, TraceLayer.USE_CASE, 'GoogleAuthService - login sin cuenta', {
          email: profile.email,
        });
        throw new UnauthorizedException('No tienes una cuenta. Regístrate primero.');
      }
      // 2a. No existe + mode 'signup' → crear cuenta Google (RF-8.2, ADR-020.7)
      user = await this.createGoogleUser(profile, tracking);
      cuentaCreada = true;
    } else if (!user.googleId) {
      // 2b. Existe (cuenta local) → vincular googleId/provider/avatarUrl (RF-8.2, ADR-020.4)
      // Sin tocar email/password/role — el repo destruye `role` del $set.
      user = await this.updateUserUseCase.execute(
        user.id,
        {
          googleId: profile.googleId,
          provider: 'google',
          avatarUrl: profile.picture ?? user.avatarUrl,
        },
        { id: user.id, role: user.role },
        tracking,
      );
    }

    // 3. updateLastLogin + tokens (RF-8.3/8.4 — mismo flujo que AuthService.login)
    await this.updateUserUseCase.updateLastLogin(user.id, tracking);
    const tokens = await this.jwtAuthService.generateTokens(user);
    await this.persistRefreshToken(user.id, tokens.refreshToken, tracking);

    // 4. Primer login (cuenta creada) → welcomeEmail best-effort (RF-23/RF-27).
    // Al VINCULAR una cuenta existente NO se envía (no es un registro nuevo).
    if (cuentaCreada && !user.welcomeEmailSent) {
      await this.sendWelcomeEmailBestEffort(user, tracking);
    }

    this.traceService.log(tracking, TraceLayer.USE_CASE, 'GoogleAuthService.authenticate - éxito', {
      id: user.id,
      creada: cuentaCreada,
    });

    const { password: _password, ...userSinPassword } = user;
    void _password;
    return { user: userSinPassword, ...tokens };
  }

  /** RF-8.2: crea el usuario Google con password hash aleatorio inutilizable (ADR-020.7). */
  private async createGoogleUser(
    profile: GoogleProfile,
    tracking: TrackingContext,
  ): Promise<User> {
    // ADR-020.7: hash aleatorio inutilizable — el login local falla con
    // 'Credenciales inválidas' sin revelar que la cuenta es de Google (RN-7).
    const randomPassword = randomBytes(16).toString('hex');

    const dto = new CreateUserDto();
    dto.email = profile.email;
    dto.password = randomPassword;
    dto.firstName = profile.givenName ?? '';
    dto.paternalLastName = profile.familyName ?? '';
    dto.maternalLastName = '';
    dto.isEmailVerified = true; // Google ya verificó el email (ADR-020.4)
    dto.googleId = profile.googleId;
    dto.provider = 'google';
    dto.avatarUrl = profile.picture;

    // userName se genera automáticamente en CreateUserUseCase (RF-3, ADR-020.1)
    return this.createUserUseCase.execute(dto, tracking);
  }

  /** RF-27: welcomeEmail best-effort — un fallo de SMTP nunca rompe el callback OAuth. */
  private async sendWelcomeEmailBestEffort(
    user: User,
    tracking: TrackingContext,
  ): Promise<void> {
    try {
      await this.welcomeEmailSender.sendWelcomeEmail(user.email);
      await this.updateUserUseCase.execute(
        user.id,
        { welcomeEmailSent: true },
        { id: user.id, role: user.role },
        tracking,
      );
      this.logger.log(`Correo de bienvenida enviado a ${user.email} (flag marcado)`);
    } catch (error) {
      this.logger.warn(
        `No se pudo enviar el correo de bienvenida a ${user.email} (best-effort, se reintentará): ${error.message}`,
      );
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
}