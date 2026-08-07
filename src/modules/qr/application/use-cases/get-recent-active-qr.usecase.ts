import { Injectable, Inject } from '@nestjs/common';
import type { ICanGetQr } from '../../domain/ports/queries/qr.port';
import type { Qr } from '../../domain/entities/qr.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { QR_GET_PORT } from '../../domain/constants/qr.tokens';

@Injectable()
export class GetRecentActiveQrUseCase {
  constructor(
    @Inject(QR_GET_PORT)
    private readonly reader: ICanGetQr,
    private readonly traceService: TraceService,
  ) {}

  async execute(limit: number, tracking: TrackingContext): Promise<Qr[]> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'GetRecentActiveQrUseCase - input', {
      limit,
    });
    return this.reader.getRecentActive(limit, tracking);
  }
}
