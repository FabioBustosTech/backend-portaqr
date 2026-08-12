import { Injectable, ConflictException, Inject, Logger } from '@nestjs/common';
import type { ICanCreateUser } from '../../domain/ports/queries/create-user.port';
import { UserEntity } from '../../domain/entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import type { User } from '../../domain/entities/user.entity';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { UserValidationRules } from '../../domain/validators/user-validation.rules';
import { PasswordService } from '../../domain/services/password.service';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { USER_CREATE_PORT } from '../../domain/constants/user.tokens';
import { EmailService } from '../../../../shared/email/email.service';
import { ConfigService } from '@nestjs/config';

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
  ) {}

  async execute(
    dto: CreateUserDto,
    tracking: TrackingContext,
  ): Promise<User> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'CreateUserUseCase - input', { email: dto.email });

    const validacion = this.validationRules.validateForCreate(dto);
    if (!validacion.valid) {
      this.traceService.warn(tracking, TraceLayer.USE_CASE, 'CreateUserUseCase - validaciÃ³n fallida', { errors: validacion.errors });
      throw new ConflictException(validacion.errors);
    }

    const datosNormalizados = this.validationRules.normalize(dto);

    const passwordHash = await this.passwordService.hashPassword(dto.password);

    // SPEC-007 H7: verificationCode generado ANTES del insert (1 round-trip total)
    const verificationCode = this.generateVerificationCode();
    const verificationCodeExpires = this.calculateExpiry();

    const usuario = new UserEntity({
      email: datosNormalizados.email,
      userName: datosNormalizados.userName,
      password: passwordHash,
      firstName: datosNormalizados.firstName!,
      paternalLastName: datosNormalizados.paternalLastName!,
      maternalLastName: datosNormalizados.maternalLastName!,
      role: 'user',
      isEmailVerified: false,
      phone: dto.phone,
      verificationCode,
      verificationCodeExpires,
    });

    let resultado: User;
    try {
      // Índices únicos en email/userName (ya existen en el schema): el E11000
      // reemplaza los pre-checks checkEmailExists/checkUserNameExists (SPEC-007 H7)
      resultado = await this.creator.create(usuario, tracking);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        this.traceService.warn(tracking, TraceLayer.USE_CASE, 'CreateUserUseCase - duplicado (E11000)', { email: datosNormalizados.email });
        throw this.mapDuplicateKeyError(error);
      }
      throw error;
    }
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'CreateUserUseCase - created', { id: resultado.id });

    // Enviar email de verificaciÃ³n (no bloquea la creaciÃ³n); usa el doc retornado
    // del insert: sin update ni getById posteriores (1 round-trip, SPEC-007 H7)
    try {
      await this.emailService.sendVerificationEmail(
        resultado.email,
        resultado.id,
        verificationCode,
      );
      this.traceService.log(tracking, TraceLayer.USE_CASE, 'CreateUserUseCase - email verificaciÃ³n enviado', { id: resultado.id });
    } catch (error) {
      this.logger.error(`Error al enviar email de verificaciÃ³n: ${error.message}`);
    }

    const { password: _password, ...usuarioSinPassword } = resultado;
    void _password;
    return usuarioSinPassword;
  }

  private generateVerificationCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
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
      return new ConflictException('El nombre de usuario ya estÃ¡ en uso');
    }
    // email (y cualquier otro índice único)
    return new ConflictException('El correo electrÃ³nico ya estÃ¡ registrado');
  }
}
