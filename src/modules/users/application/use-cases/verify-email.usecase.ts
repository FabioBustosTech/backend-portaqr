import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import type { ICanGetUser } from '../../domain/ports/queries/get-user.port';
import type { ICanUpdateUser } from '../../domain/ports/queries/create-user.port';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { USER_GET_PORT, USER_UPDATE_PORT } from '../../domain/constants/user.tokens';
import { VERIFICATION_MAX_ATTEMPTS } from '../../../../common/utils/code-generator.util';
import { NewsletterSyncService } from '../services/newsletter-sync.service';

@Injectable()
export class VerifyEmailUseCase {
  private readonly logger = new Logger(VerifyEmailUseCase.name);

  constructor(
    @Inject(USER_GET_PORT)
    private readonly reader: ICanGetUser,
    @Inject(USER_UPDATE_PORT)
    private readonly updater: ICanUpdateUser,
    private readonly traceService: TraceService,
    private readonly newsletterSync: NewsletterSyncService,
  ) {}

  async execute(userId: string, code: string, tracking: TrackingContext): Promise<void> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'VerifyEmailUseCase', { userId });

    const user = await this.reader.getById(userId, tracking);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('El email ya está verificado');
    }

    if (!user.verificationCode || !user.verificationCodeExpires) {
      throw new BadRequestException('No hay código de verificación pendiente');
    }

    if (user.verificationCode !== code) {
      // SPEC-009 A5: límite de intentos — tras 5 fallos se invalida el código
      const attempts = (user.verificationAttempts ?? 0) + 1;
      if (attempts >= VERIFICATION_MAX_ATTEMPTS) {
        await this.updater.update(userId, {
          verificationCode: undefined,
          verificationCodeExpires: undefined,
          verificationAttempts: 0,
        }, tracking);
        throw new BadRequestException('El código de verificación ha expirado');
      }
      await this.updater.update(userId, { verificationAttempts: attempts }, tracking);
      throw new BadRequestException('Código de verificación inválido');
    }

    if (new Date() > user.verificationCodeExpires) {
      throw new BadRequestException('El código de verificación ha expirado');
    }

    await this.updater.update(userId, {
      isEmailVerified: true,
      verificationCode: undefined,
      verificationCodeExpires: undefined,
      verificationAttempts: 0,
    }, tracking);

    this.traceService.log(tracking, TraceLayer.USE_CASE, 'VerifyEmailUseCase - verificado', { userId });

    // SPEC-030 RF-8 (timing verificado): el CMS solo ve `subscribed` cuando la
    // verificación termina. Si pidió newsletter en el signup y aún no se
    // sincronizó, se reporta ahora (best-effort, nunca rompe el verify).
    if (user.newsletterOptIn === true && !user.newsletterSyncedAt) {
      try {
        const synced = await this.newsletterSync.syncSubscribe({
          email: user.email,
          name: [user.firstName, user.paternalLastName].filter(Boolean).join(' ').trim() || undefined,
          userId,
          source: 'signup',
        });
        if (synced) {
          try {
            await this.updater.update(userId, { newsletterSyncedAt: new Date() }, tracking);
          } catch {
            this.logger.warn(`newsletter_sync_failed { userId, reason: audit-update }`);
          }
        }
      } catch {
        this.logger.warn(`newsletter_sync_failed { userId, reason: inesperado }`);
      }
    }
  }
}
