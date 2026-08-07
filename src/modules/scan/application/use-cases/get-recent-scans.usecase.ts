import { Injectable, Inject } from '@nestjs/common';
import type { ICanGetScan } from '../../domain/ports/queries/scan.port';
import type { Scan } from '../../domain/entities/scan.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { SCAN_GET_PORT } from '../../domain/constants/scan.tokens';

@Injectable()
export class GetRecentScansUseCase {
  constructor(
    @Inject(SCAN_GET_PORT)
    private readonly reader: ICanGetScan,
    private readonly traceService: TraceService,
  ) {}

  async execute(idQr: string, limit: number, tracking: TrackingContext): Promise<Scan[]> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'GetRecentScansUseCase - input', {
      idQr,
      limit,
    });
    return this.reader.getRecentScans(idQr, limit, tracking);
  }
}
