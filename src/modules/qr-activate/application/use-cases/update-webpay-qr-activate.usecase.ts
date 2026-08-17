import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import type { ICanGetQrActivate, ICanUpdateQrActivate, ICanActivateQr } from '../../domain/ports/queries/qr-activate.port';
import type { QrActivate } from '../../domain/entities/qr-activate.entity';
import { ActivationState, WebpayState } from '../../domain/entities/qr-activate.entity';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { QR_ACTIVATE_GET_PORT, QR_ACTIVATE_UPDATE_PORT, QR_ACTIVATE_QR_PORT } from '../../domain/constants/qr-activate.tokens';
import { CommitTransactionUseCase } from '../../../webpay/application/use-cases/commit-transaction.usecase';
import type { CommitTransactionMapped } from '../../../webpay/application/use-cases/commit-transaction.usecase';
import { QrActivatedNotificationService } from '../services/qr-activated-notification.service';

@Injectable()
export class UpdateWebpayQrActivateUseCase {
  private readonly logger = new Logger(UpdateWebpayQrActivateUseCase.name);

  constructor(
    @Inject(QR_ACTIVATE_GET_PORT)
    private readonly reader: ICanGetQrActivate,
    @Inject(QR_ACTIVATE_UPDATE_PORT)
    private readonly updater: ICanUpdateQrActivate,
    @Inject(QR_ACTIVATE_QR_PORT)
    private readonly qrActivator: ICanActivateQr,
    private readonly commitTransactionUseCase: CommitTransactionUseCase,
    private readonly notificationService: QrActivatedNotificationService, // SPEC-019 RF-5
    private readonly traceService: TraceService,
  ) {}

  async execute(token_ws: string, tracking: TrackingContext): Promise<QrActivate> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'UpdateWebpayQrActivateUseCase', { token_ws });

    const activation = await this.reader.getByWebpayToken(token_ws, tracking);
    if (!activation) {
      throw new NotFoundException(`Activación con token_ws ${token_ws} no encontrada`);
    }

    if (activation.state !== ActivationState.PENDING) {
      this.traceService.warn(tracking, TraceLayer.USE_CASE, 'UpdateWebpayQrActivateUseCase - ya procesada', { token_ws });
      return activation;
    }

    let commitResult: CommitTransactionMapped | null;
    try {
      commitResult = await this.commitTransactionUseCase.execute(token_ws, tracking);
    } catch (error) {
      // Fix 2026-08-17 (idempotencia ante carrera — SPEC-007 RF-3): el frontend
      // (React StrictMode) dispara el PATCH dos veces casi simultáneas; ambas leen
      // PENDING y la 2ª recibe 422 de Webpay (token ya committeado por la 1ª).
      // Si la activación ya fue procesada por la otra request, responder con su
      // estado actual (200) — el pago fue exitoso y el QR ya está activo. NO
      // propagar el error: el usuario vería "pago fallido" con el QR activado.
      const current = await this.reader.getByWebpayToken(token_ws, tracking);
      if (current && current.state !== ActivationState.PENDING) {
        this.traceService.warn(
          tracking,
          TraceLayer.USE_CASE,
          'UpdateWebpayQrActivateUseCase - carrera: transacción ya procesada por otra request',
          { token_ws, state: current.state },
        );
        return current;
      }
      throw error;
    }

    if (!commitResult) {
      throw new Error('Error al actualizar Webpay transaction');
    }

    let updatedState: ActivationState;

    if (commitResult.status === 'AUTHORIZED') {
      // SPEC-009 B12: el monto cobrado por Transbank debe coincidir con el SNAPSHOT
      // del precio calculado desde el plan. Si el cliente intentó pagar menos
      // (amount falso en el create), NO se activan los QRs.
      if (activation.price?.TotalPrice !== commitResult.amount) {
        this.traceService.warn(
          tracking,
          TraceLayer.USE_CASE,
          'UpdateWebpayQrActivateUseCase - amount mismatch vs snapshot',
          { snapshot: activation.price?.TotalPrice, transbank: commitResult.amount },
        );
        updatedState = ActivationState.FAILED;
      } else {
        updatedState = ActivationState.PAYED;
        this.traceService.log(tracking, TraceLayer.USE_CASE, 'UpdateWebpayQrActivateUseCase - PAGADO', { token_ws });

        // Activar los QRs de la compra en 1 operación batch atómica (SPEC-007 H2)
        const codes = activation.qrList.map((qr) => qr.qrCode);
        if (codes.length > 0) {
          const { matchedCount, modifiedCount } = await this.qrActivator.activateMany(
            codes,
            activation.qrList[0]?.expirationDate ?? new Date(),
            tracking,
          );

          if (matchedCount < codes.length) {
            this.traceService.warn(
              tracking,
              TraceLayer.USE_CASE,
              'UpdateWebpayQrActivateUseCase - QRs inexistentes',
              { token_ws, total: codes.length, matchedCount, modifiedCount },
            );
          }
        }
      }
    } else {
      updatedState = ActivationState.FAILED;
    }

    const updateData: Partial<QrActivate> = {
      state: updatedState,
      WebpayTransaction: {
        ...activation.WebpayTransaction,
        state: commitResult.status as WebpayState,
      },
    };

    // SPEC-019 RF-8: la fecha de activación se persiste SOLO en PAYED (en FAILED no se re-escribe — RN-8)
    if (updatedState === ActivationState.PAYED) {
      updateData.activationDate = new Date();
    }

    const updated = await this.updater.update(activation.id, updateData, tracking);

    if (!updated) {
      throw new Error('Error al guardar la activación');
    }

    // SPEC-019 RF-5: correo de activación al dueño (best-effort — ADR-019.2, nunca bloquea la
    // persistencia). Se invoca DESPUÉS del update con `updated` para que el correo lea el
    // `activationDate` ya persistido (ADR-019.6). Solo en PAYED (CA-05: FAILED no notifica).
    // Defensa en profundidad: aunque el servicio de notificación nunca re-throw (contrato),
    // un fallo aquí jamás debe romper el callback de Webpay (RN-2).
    if (updatedState === ActivationState.PAYED) {
      try {
        await this.notificationService.notify(updated, tracking);
      } catch (error) {
        this.traceService.error(
          tracking,
          TraceLayer.USE_CASE,
          'UpdateWebpayQrActivateUseCase - notify falló (best-effort)',
          error,
        );
      }
    }

    return updated;
  }
}
