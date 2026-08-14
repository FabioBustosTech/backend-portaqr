import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ICanUpdateQr, ICanGetQr } from '../../domain/ports/queries/qr.port';
import type { Qr } from '../../domain/entities/qr.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { QR_UPDATE_PORT, QR_GET_PORT } from '../../domain/constants/qr.tokens';

/**
 * SPEC-014: desactivación admin de un QR con motivo obligatorio.
 *
 * - Solo admin (el guard del controller lo garantiza).
 * - El motivo se persiste en el QR (`deactivationReason` + `deactivatedAt` + `deactivatedBy`)
 *   para trazabilidad — solo visible en el panel admin, nunca en respuestas públicas.
 * - NO toca qractivates/transactions (snapshot inmutable, SPEC-009 B12).
 * - Públicamente el QR se comporta igual que uno nunca activado (active:false).
 */
@Injectable()
export class DeactivateQrUseCase {
  constructor(
    @Inject(QR_GET_PORT)
    private readonly reader: ICanGetQr,
    @Inject(QR_UPDATE_PORT)
    private readonly updater: ICanUpdateQr,
    private readonly traceService: TraceService,
  ) {}

  async execute(
    id: string,
    reason: string,
    actorId: string,
    tracking: TrackingContext,
  ): Promise<Qr> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'DeactivateQrUseCase - input', {
      id,
      reasonLength: reason.length,
    });

    // 404 si el QR no existe (fail-fast antes de escribir)
    const existing = await this.reader.getById(id, tracking);
    if (!existing) {
      this.traceService.warn(tracking, TraceLayer.USE_CASE, 'DeactivateQrUseCase - not found', {
        id,
      });
      throw new NotFoundException(`QR con id ${id} no encontrado`);
    }

    if (!existing.active) {
      this.traceService.warn(
        tracking,
        TraceLayer.USE_CASE,
        'DeactivateQrUseCase - already inactive',
        { id },
      );
      throw new NotFoundException(`El QR ${id} ya está inactivo`);
    }

    const updated = await this.updater.deactivate(id, reason, actorId, tracking);

    this.traceService.log(tracking, TraceLayer.USE_CASE, 'DeactivateQrUseCase - complete', {
      id,
      deactivatedBy: actorId,
    });

    return updated!;
  }
}
