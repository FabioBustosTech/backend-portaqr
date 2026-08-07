import { Injectable, Inject } from '@nestjs/common';
import type { ICanGetQr, QrPagination } from '../../domain/ports/queries/qr.port';
import type { Qr } from '../../domain/entities/qr.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { QR_GET_PORT } from '../../domain/constants/qr.tokens';

@Injectable()
export class GetPaginatedQrsByUserUseCase {
  constructor(
    @Inject(QR_GET_PORT)
    private readonly reader: ICanGetQr,
    private readonly traceService: TraceService,
  ) {}

  async execute(
    userId: string,
    page: number,
    limit: number,
    search: string,
    tracking: TrackingContext,
  ): Promise<{ data: Qr[]; pagination: QrPagination }> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'GetPaginatedQrsByUserUseCase - input', {
      userId,
      page,
      limit,
      search,
    });
    return this.reader.findPaginatedByUser(userId, page, limit, search, tracking);
  }
}
