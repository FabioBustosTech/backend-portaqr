import { Injectable, ConflictException, Inject, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { ICanCreateUser } from '../../domain/ports/queries/create-user.port';
import { UserEntity } from '../../domain/entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import type { User } from '../../domain/entities/user.entity';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { UserValidationRules } from '../../domain/validators/user-validation.rules';
import { PasswordService } from '../../domain/services/password.service';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { USER_CREATE_PORT, USER_UPDATE_PORT } from '../../domain/constants/user.tokens';
import { generateVerificationCode as generateVerificationCodeUtil } from '../../../../common/utils/code-generator.util';
import { EmailService } from '../../../../shared/email/email.service';
import { ConfigService } from '@nestjs/config';
import { NewsletterSyncService } from '../services/newsletter-sync.service';
import type { ICanUpdateUser } from '../../domain/ports/queries/create-user.port';

/** Error de índice único de MongoDB (E11000) */
interface MongoDuplicateKeyError {
  code?: number;
  keyPattern?: Record<string, unknown>;
}

@Injectable()
export class CreateUserUseCase {
  private readonly logger = new Logger(CreateUserUseCase.name);

  constructor(
    @Inject(USER_CREATE_PORT)
    private readonly creator: ICanCreateUser,
    private readonly validationRules: UserValidationRules,
    private readonly passwordService: PasswordService,
    private readonly traceService: TraceService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly newsletterSync: NewsletterSyncService,
    @Inject(USER_UPDATE_PORT)
    private readonly updater: ICanUpdateUser,
  ) {}

  async execute(
    dto: CreateUserDto,
    tracking: TrackingContext,
  ): Promise<User> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'CreateUserUseCase - input', { email: dto.email });

    const validacion = this.validationRules.validateForCreate(dto);
    if (!validacion.valid) {
      this.traceService.warn(tracking, TraceLayer.USE_CASE, 'CreateUserUseCase - validación fallida', { errors: validacion.errors });
      throw new ConflictException(validacion.errors);
    }

const datosNormalizados = this.validationRules.normalize(dto);

    const passwordHash = await this.passwordService.hashPassword(dto.password);

    // SPEC-020 RF-3 (ADR-020.1): userName generado automáticamente si no se provee
    // (signup simplificado u onboarding omitido). CSPRNG: 8 hex = 4.3×10⁹ combinaciones.
    // `userNameGenerado` distingue el caso auto-generado (reintentable ante E11000)
    // del userName elegido por el usuario (conflicto real → 409).
    const userNameProveido = datosNormalizados.userName?.trim();
    const userNameGenerado = !userNameProveido;
    const userName = userNameProveido || this.generateUserName();

    // SPEC-007 H7: verificationCode generado ANTES del insert (1 round-trip total).
    // SPEC-020 RF-8: si el email ya está verificado (usuario Google), NO se genera
    // código de verificación ni se envía el correo.
    const emailVerificado = dto.isEmailVerified === true;
    const verificationCode = emailVerificado ? undefined : this.generateVerificationCode();
    const verificationCodeExpires = emailVerificado ? undefined : this.calculateExpiry();

    // SPEC-020 RF-3: reintento ante E11000 por userName GENERADO (defensa en
    // profundidad — 8 hex = 4.3×10⁹ combinaciones, colisión prácticamente imposible).
    const MAX_USERNAME_RETRIES = 3;
    let resultado: User;

    for (let intento = 0; intento < MAX_USERNAME_RETRIES; intento++) {
      const usuario = new UserEntity({
        email: datosNormalizados.email,
        userName: intento === 0 ? userName : this.generateUserName(),
        password: passwordHash,
        firstName: datosNormalizados.firstName ?? '',
        paternalLastName: datosNormalizados.paternalLastName ?? '',
        maternalLastName: datosNormalizados.maternalLastName ?? '',
        role: 'user',
        isEmailVerified: emailVerificado,
        phone: dto.phone,
        verificationCode,
        verificationCodeExpires,
        // SPEC-020 RF-9: campos Google (solo los setea GoogleAuthService)
        googleId: dto.googleId,
        provider: dto.provider ?? 'local',
        // SPEC-020: las cuentas Google nacen sin contraseña real (hash aleatorio
        // inutilizable — ADR-020.7) → hasPassword: false hasta el primer set-password
        hasPassword: dto.provider === 'google' ? false : true,
        avatarUrl: dto.avatarUrl,
        // SPEC-030 RF-8: copia local del intent (la fuente de verdad es qr-cms)
        newsletterOptIn: dto.newsletterOptIn ?? false,
      });

      try {
        // Índices únicos en email/userName (ya existen en el schema): el E11000
        // reemplaza los pre-checks checkEmailExists/checkUserNameExists (SPEC-007 H7)
        resultado = await this.creator.create(usuario, tracking);
        break;
      } catch (error) {
        if (!this.isDuplicateKeyError(error)) {
          throw error;
        }
        // E11000: distinguir email duplicado (real) de userName duplicado
        const keyPattern = (error as MongoDuplicateKeyError).keyPattern ?? {};
        if (keyPattern.email) {
          this.traceService.warn(tracking, TraceLayer.USE_CASE, 'CreateUserUseCase - email duplicado (E11000)', { email: datosNormalizados.email });
          throw new ConflictException('El correo electrónico ya está registrado');
        }
        if (keyPattern.userName) {
          // userName elegido por el usuario → conflicto real (409)
          if (!userNameGenerado) {
            this.traceService.warn(tracking, TraceLayer.USE_CASE, 'CreateUserUseCase - userName duplicado (E11000)', { userName });
            throw new ConflictException('El nombre de usuario ya está en uso');
          }
          // userName GENERADO → colisión astronómicamente improbable; reintentar
          this.traceService.warn(tracking, TraceLayer.USE_CASE, 'CreateUserUseCase - userName generado colisionó, reintentando', { intento });
          continue;
        }
        throw error;
      }
    }

    if (!resultado) {
      throw new ConflictException('No se pudo crear el usuario (conflicto de nombre de usuario)');
    }
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'CreateUserUseCase - created', { id: resultado.id });

    // Enviar email de verificación (no bloquea la creación); usa el doc retornado
    // del insert: sin update ni getById posteriores (1 round-trip, SPEC-007 H7).
    // SPEC-020 RF-8: NO se envía si el email ya está verificado (usuario Google).
    if (!emailVerificado) {
      try {
        await this.emailService.sendVerificationEmail(
          resultado.email,
          resultado.id,
          verificationCode!,
        );
        this.traceService.log(tracking, TraceLayer.USE_CASE, 'CreateUserUseCase - email verificación enviado', { id: resultado.id });
      } catch (error) {
        this.logger.error(`Error al enviar email de verificación: ${error.message}`);
      }
    }

    const { password: _password, ...usuarioSinPassword } = resultado;
    void _password;

    // SPEC-030 RF-8 (timing verificado): el sync al CMS ocurre SOLO con email
    // verificado. Cuentas Google (emailVerificado=true) sincronizan aquí;
    // signup email difiere el sync a VerifyEmailUseCase (el CMS no debe ver
    // `subscribed` antes de la verificación). Nunca bloquea el 201 (RN-2).
    if (dto.newsletterOptIn === true && emailVerificado) {
      try {
        const name = [resultado.firstName, resultado.paternalLastName]
          .filter(Boolean)
          .join(' ')
          .trim();
        const synced = await this.newsletterSync.syncSubscribe({
          email: resultado.email,
          name: name || undefined,
          userId: resultado.id,
          source: 'signup',
        });
        if (synced) {
          try {
            await this.updater.update(resultado.id, { newsletterSyncedAt: new Date() }, tracking);
          } catch {
            this.logger.warn(`newsletter_sync_failed { userId: ${resultado.id}, reason: audit-update }`);
          }
        }
      } catch {
        this.logger.warn(`newsletter_sync_failed { userId: ${resultado.id}, reason: inesperado }`);
      }
    } else if (dto.newsletterOptIn === true) {
      this.logger.log(`newsletter_sync_diferido { userId: ${resultado.id}, reason: email-sin-verificar }`);
    }

    return usuarioSinPassword;
  }

  /** SPEC-020 RF-3 (ADR-020.1): genera `user_<8 hex>` con CSPRNG (nunca colisiona en la práctica). */
  private generateUserName(): string {
    return `user_${randomBytes(4).toString('hex')}`;
  }

  private generateVerificationCode(): string {
    return generateVerificationCodeUtil(); // SPEC-009 A5: CSPRNG (crypto.randomBytes)
  }

  private calculateExpiry(): Date {
    const expiryTime = new Date();
    const expirySeconds = parseInt(this.configService.get('EMAIL_VERIFICATION_EXPIRY')) || 3600;
    expiryTime.setSeconds(expiryTime.getSeconds() + expirySeconds);
    return expiryTime;
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as MongoDuplicateKeyError).code === 11000
    );
  }

  private mapDuplicateKeyError(error: unknown): ConflictException {
    const keyPattern = (error as MongoDuplicateKeyError).keyPattern ?? {};
    if (keyPattern.userName) {
      return new ConflictException('El nombre de usuario ya está en uso');
    }
    // email (y cualquier otro índice único)
    return new ConflictException('El correo electrónico ya está registrado');
  }
}
