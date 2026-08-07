import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ICanGetQr } from '../../domain/ports/queries/qr.port';
import type { Qr } from '../../domain/entities/qr.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { QR_GET_PORT } from '../../domain/constants/qr.tokens';

@Injectable()
export class GetQrUseCase {
  constructor(
    @Inject(QR_GET_PORT)
    private readonly reader: ICanGetQr,
    private readonly traceService: TraceService,
  ) {}

  async execute(id: string, tracking: TrackingContext): Promise<Qr> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'GetQrUseCase - input', { id });

    const qr = await this.reader.getById(id, tracking);
    if (!qr) {
      this.traceService.warn(tracking, TraceLayer.USE_CASE, 'GetQrUseCase - not found', { id });
      throw new NotFoundException(`QR no encontrado: ${id}`);
    }
    return qr;
  }
}
