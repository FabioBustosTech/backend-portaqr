import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ICanDeleteQr } from '../../domain/ports/queries/qr.port';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { QR_DELETE_PORT } from '../../domain/constants/qr.tokens';

@Injectable()
export class DeleteQrUseCase {
  constructor(
    @Inject(QR_DELETE_PORT)
    private readonly deleter: ICanDeleteQr,
    private readonly traceService: TraceService,
  ) {}

  async execute(id: string, tracking: TrackingContext): Promise<void> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'DeleteQrUseCase - input', { id });

    const result = await this.deleter.delete(id, tracking);
    if (!result) {
      this.traceService.warn(tracking, TraceLayer.USE_CASE, 'DeleteQrUseCase - not found', { id });
      throw new NotFoundException(`QR no encontrado: ${id}`);
    }
  }
}
