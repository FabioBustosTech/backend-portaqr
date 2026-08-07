import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ICanDeleteQrActivate } from '../../domain/ports/queries/qr-activate.port';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { QR_ACTIVATE_DELETE_PORT } from '../../domain/constants/qr-activate.tokens';

@Injectable()
export class DeleteQrActivateUseCase {
  constructor(
    @Inject(QR_ACTIVATE_DELETE_PORT)
    private readonly deleter: ICanDeleteQrActivate,
    private readonly traceService: TraceService,
  ) {}

  async execute(id: string, tracking: TrackingContext): Promise<void> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'DeleteQrActivateUseCase', { id });
    const deleted = await this.deleter.delete(id, tracking);
    if (!deleted) {
      throw new NotFoundException(`Activación con ID ${id} no encontrada`);
    }
  }
}
