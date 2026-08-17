import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ICanSendQrActivatedEmail } from '../../domain/ports/queries/qr-activate-email.port';
import { QR_ACTIVATE_EMAIL_PORT } from '../../domain/constants/qr-activate.tokens';
import { getQrTypeLabel } from '../../domain/constants/qr-type-labels';
import type { QrActivate } from '../../domain/entities/qr-activate.entity';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { GetUserUseCase } from '../../../users/application/use-cases/get-user.usecase';
import { GetQrUseCase } from '../../../qr/application/use-cases/get-qr.usecase';
import type { User } from '../../../users/domain/entities/user.entity';
import type { QrActivatedEmailPayload } from '../../../../shared/email/email.service';

/**
 * SPEC-019 RF-4: notificación de activación de QRs (best-effort — ADR-019.2).
 * Capa de aplicación: inyecta el puerto `ICanSendQrActivatedEmail` (ADR-019.8) y
 * use cases de otros módulos (patrón establecido: GetPlanUseCase/GetQrUseCase).
 */
@Injectable()
export class QrActivatedNotificationService {
  constructor(
    @Inject(QR_ACTIVATE_EMAIL_PORT)
    private readonly emailSender: ICanSendQrActivatedEmail,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly getQrUseCase: GetQrUseCase,
    private readonly traceService: TraceService,
    private readonly configService: ConfigService,
  ) {}

  /** Envía el correo de activación al dueño. Nunca re-throw (RN-2/ADR-019.2). */
  async notify(activation: QrActivate, tracking: TrackingContext): Promise<void> {
    try {
      // 1. Dueño de la activación (RN-3: el cliente, no el admin; RN-4: 404 → skip con warn)
      let user: User;
      try {
        user = await this.getUserUseCase.execute(activation.userId, tracking);
      } catch (error) {
        if (error instanceof NotFoundException) {
          this.traceService.warn(
            tracking,
            TraceLayer.SERVICE,
            'QrActivatedNotificationService - usuario inexistente (skip)',
            { activationId: activation.id, userId: activation.userId },
          );
          return;
        }
        throw error;
      }

      // 2. Resolver typeQr/name/id por QR (QrElement no guarda el tipo — verificado 2026-08-17)
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      const qrItems: QrActivatedEmailPayload['qrItems'] = [];
      for (const qr of activation.qrList) {
        const qrDoc = await this.getQrUseCase.execute(qr.qrCode, tracking);
        qrItems.push({
          code: qr.qrCode,
          name: qrDoc.name,
          typeQr: qrDoc.typeQr,
          typeLabel: getQrTypeLabel(qrDoc.typeQr),
          plan: qr.plan,
          duration: qr.duration,
          activationDate: activation.activationDate ?? activation.createdAt,
          expirationDate: qr.expirationDate,
          landingUrl: `${frontendUrl}/qr/${qrDoc.id}?origen=qr`,
        });
      }

      const payload: QrActivatedEmailPayload = {
        to: user.email,
        userName: `${user.firstName} ${user.paternalLastName}`.trim(),
        qrItems,
        methodActivation: activation.methodActivation,
        totalPrice: activation.price?.TotalPrice ?? 0,
      };

      // 3. Envío best-effort (ADR-019.2: el QR ya quedó activo — el correo nunca lo revierte)
      await this.emailSender.sendQrActivatedEmail(payload);
    } catch (error) {
      this.traceService.error(
        tracking,
        TraceLayer.SERVICE,
        `QrActivatedNotificationService - email_activation_failed { activationId: ${activation.id}, userId: ${activation.userId}, reason: ${error.message} }`,
        error,
      );
    }
  }
}