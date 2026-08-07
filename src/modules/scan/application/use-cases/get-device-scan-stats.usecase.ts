import { Injectable, Inject } from '@nestjs/common';
import type { ICanGetScan } from '../../domain/ports/queries/scan.port';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { SCAN_GET_PORT } from '../../domain/constants/scan.tokens';

@Injectable()
export class GetDeviceScanStatsUseCase {
  constructor(
    @Inject(SCAN_GET_PORT)
    private readonly reader: ICanGetScan,
    private readonly traceService: TraceService,
  ) {}

  async execute(idQr: string, tracking: TrackingContext): Promise<unknown> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'GetDeviceScanStatsUseCase - input', {
      idQr,
    });
    return this.reader.getDeviceStats(idQr, tracking);
  }
}
