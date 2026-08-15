import { Injectable, Inject, Logger } from '@nestjs/common';
import type { ICanGetUser } from '../../domain/ports/queries/get-user.port';
import type { ICanUpdateUser } from '../../domain/ports/queries/create-user.port';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { USER_GET_PORT, USER_UPDATE_PORT } from '../../domain/constants/user.tokens';
import { generateVerificationCode as generateVerificationCodeUtil } from '../../../../common/utils/code-generator.util';
import { EmailService } from '../../../../shared/email/email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ForgotPasswordUseCase {
  private readonly logger = new Logger(ForgotPasswordUseCase.name);

  constructor(
    @Inject(USER_GET_PORT)
    private readonly reader: ICanGetUser,
    @Inject(USER_UPDATE_PORT)
    private readonly updater: ICanUpdateUser,
    private readonly traceService: TraceService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async execute(email: string, tracking: TrackingContext): Promise<void> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'ForgotPasswordUseCase', { email });

    const user = await this.reader.getByEmail(email, tracking);
    if (!user) {
      // SPEC-009 A4: respuesta genérica — NO revelar si el email existe
      // (el controller responde 200 "si el correo existe, recibirás un código").
      this.traceService.log(
        tracking,
        TraceLayer.USE_CASE,
        'ForgotPasswordUseCase - email no registrado (respuesta genérica)',
        { email },
      );
      return;
    }

    const resetCode = generateVerificationCodeUtil(); // SPEC-009 A5: CSPRNG (crypto.randomBytes)
    const expiryTime = new Date();
    const expirySeconds = parseInt(this.configService.get('EMAIL_VERIFICATION_EXPIRY')) || 3600;
    expiryTime.setSeconds(expiryTime.getSeconds() + expirySeconds);

    await this.updater.update(user.id, {
      passwordResetCode: resetCode,
      passwordResetExpires: expiryTime,
    }, tracking);

    const nombreCompleto = `${user.firstName} ${user.paternalLastName} ${user.maternalLastName}`;
    await this.emailService.sendPasswordResetEmail(email, resetCode, nombreCompleto);

    this.traceService.log(tracking, TraceLayer.USE_CASE, 'ForgotPasswordUseCase - código enviado', { email });
  }
}
