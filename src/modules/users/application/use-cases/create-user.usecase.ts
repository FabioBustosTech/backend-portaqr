import { Injectable, ConflictException, Inject, Logger } from '@nestjs/common';
import type { ICanCreateUser } from '../../domain/ports/queries/create-user.port';
import type { ICanGetUser } from '../../domain/ports/queries/get-user.port';
import type { ICanCheckUser, ICanUpdateUser } from '../../domain/ports/queries/create-user.port';
import { UserEntity } from '../../domain/entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import type { User } from '../../domain/entities/user.entity';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { UserValidationRules } from '../../domain/validators/user-validation.rules';
import { PasswordService } from '../../domain/services/password.service';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import {
  USER_CREATE_PORT,
  USER_GET_PORT,
  USER_CHECK_PORT,
  USER_UPDATE_PORT,
} from '../../domain/constants/user.tokens';
import { EmailService } from '../../../../shared/email/email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CreateUserUseCase {
  private readonly logger = new Logger(CreateUserUseCase.name);

  constructor(
    @Inject(USER_CREATE_PORT)
    private readonly creator: ICanCreateUser,
    @Inject(USER_GET_PORT)
    private readonly reader: ICanGetUser,
    @Inject(USER_CHECK_PORT)
    private readonly checker: ICanCheckUser,
    @Inject(USER_UPDATE_PORT)
    private readonly updater: ICanUpdateUser,
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

    const existenteEmail = await this.checker.checkEmailExists(
      datosNormalizados.email!,
      tracking,
    );
    if (existenteEmail) {
      this.traceService.warn(tracking, TraceLayer.USE_CASE, 'CreateUserUseCase - email duplicado', { email: datosNormalizados.email });
      throw new ConflictException('El correo electrÃ³nico ya estÃ¡ registrado');
    }

    const existenteUsername = await this.checker.checkUserNameExists(
      datosNormalizados.userName!,
      tracking,
    );
    if (existenteUsername) {
      this.traceService.warn(tracking, TraceLayer.USE_CASE, 'CreateUserUseCase - username duplicado', { userName: datosNormalizados.userName });
      throw new ConflictException('El nombre de usuario ya estÃ¡ en uso');
    }

    const passwordHash = await this.passwordService.hashPassword(dto.password);

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
    });

    const resultado = await this.creator.create(usuario, tracking);
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'CreateUserUseCase - created', { id: resultado.id });

    // Enviar email de verificaciÃ³n (no bloquea la creaciÃ³n)
    try {
      await this.sendVerificationEmail(resultado.id, tracking);
      this.traceService.log(tracking, TraceLayer.USE_CASE, 'CreateUserUseCase - email verificaciÃ³n enviado', { id: resultado.id });
    } catch (error) {
      this.logger.error(`Error al enviar email de verificaciÃ³n: ${error.message}`);
    }

    const { password: _password, ...usuarioSinPassword } = resultado;
    void _password;
    return usuarioSinPassword;
  }

  private async sendVerificationEmail(userId: string, tracking: TrackingContext): Promise<void> {
    const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiryTime = new Date();
    const expirySeconds = parseInt(this.configService.get('EMAIL_VERIFICATION_EXPIRY')) || 3600;
    expiryTime.setSeconds(expiryTime.getSeconds() + expirySeconds);

    await this.updater.update(userId, {
      verificationCode,
      verificationCodeExpires: expiryTime,
    }, tracking);

    const user = await this.reader.getById(userId, tracking);
    if (user) {
      await this.emailService.sendVerificationEmail(user.email, userId, verificationCode);
    }
  }
}
