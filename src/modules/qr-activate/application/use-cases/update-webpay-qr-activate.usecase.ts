import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import type { ICanGetQrActivate, ICanUpdateQrActivate, ICanActivateQr } from '../../domain/ports/queries/qr-activate.port';
import type { QrActivate } from '../../domain/entities/qr-activate.entity';
import { ActivationState, WebpayState } from '../../domain/entities/qr-activate.entity';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { QR_ACTIVATE_GET_PORT, QR_ACTIVATE_UPDATE_PORT, QR_ACTIVATE_QR_PORT } from '../../domain/constants/qr-activate.tokens';
import { CommitTransactionUseCase } from '../../../webpay/application/use-cases/commit-transaction.usecase';

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

    const commitResult = await this.commitTransactionUseCase.execute(token_ws, tracking);

    if (!commitResult) {
      throw new Error('Error al actualizar Webpay transaction');
    }

    let updatedState: ActivationState;

    if (commitResult.status === 'AUTHORIZED') {
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
    } else {
      updatedState = ActivationState.FAILED;
    }

    const updated = await this.updater.update(
      activation.id,
      {
        state: updatedState,
        WebpayTransaction: {
          ...activation.WebpayTransaction,
          state: commitResult.status as WebpayState,
        },
      },
      tracking,
    );

    if (!updated) {
      throw new Error('Error al guardar la activación');
    }

    return updated;
  }
}
