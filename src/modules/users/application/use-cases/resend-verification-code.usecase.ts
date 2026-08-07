import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import type { ICanGetUser } from '../../domain/ports/queries/get-user.port';
import type { ICanUpdateUser } from '../../domain/ports/queries/create-user.port';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { USER_GET_PORT, USER_UPDATE_PORT } from '../../domain/constants/user.tokens';
import { EmailService } from '../../../../shared/email/email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ResendVerificationCodeUseCase {
  private readonly logger = new Logger(ResendVerificationCodeUseCase.name);

  constructor(
    @Inject(USER_GET_PORT)
    private readonly reader: ICanGetUser,
    @Inject(USER_UPDATE_PORT)
    private readonly updater: ICanUpdateUser,
    private readonly traceService: TraceService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async execute(userId: string, tracking: TrackingContext): Promise<void> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'ResendVerificationCodeUseCase', { userId });

    const user = await this.reader.getById(userId, tracking);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('El email ya estÃ¡ verificado');
    }

    const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiryTime = new Date();
    const expirySeconds = parseInt(this.configService.get('EMAIL_VERIFICATION_EXPIRY')) || 3600;
    expiryTime.setSeconds(expiryTime.getSeconds() + expirySeconds);

    await this.updater.update(userId, {
      verificationCode,
      verificationCodeExpires: expiryTime,
    }, tracking);

    await this.emailService.sendVerificationEmail(user.email, userId, verificationCode);
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'ResendVerificationCodeUseCase - enviado', { userId });
  }
}
