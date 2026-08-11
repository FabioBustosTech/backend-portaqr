import { Injectable, Inject } from '@nestjs/common';
import type { ICanUpdateQr } from '../../domain/ports/queries/qr.port';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { QR_UPDATE_PORT } from '../../domain/constants/qr.tokens';

@Injectable()
export class ActivateManyQrsUseCase {
  constructor(
    @Inject(QR_UPDATE_PORT)
    private readonly updater: ICanUpdateQr,
    private readonly traceService: TraceService,
  ) {}

  async execute(
    qrCodes: string[],
    expiration: Date,
    tracking: TrackingContext,
  ): Promise<{ matchedCount: number; modifiedCount: number }> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'ActivateManyQrsUseCase - input', {
      total: qrCodes.length,
    });

    const result = await this.updater.activateMany(qrCodes, expiration, tracking);

    this.traceService.log(tracking, TraceLayer.USE_CASE, 'ActivateManyQrsUseCase - complete', {
      total: qrCodes.length,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });

    return result;
  }
}
