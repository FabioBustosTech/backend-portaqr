import { Injectable, Inject } from '@nestjs/common';
import type { ICanGetQr, QrPagination } from '../../domain/ports/queries/qr.port';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { QR_GET_PORT } from '../../domain/constants/qr.tokens';

@Injectable()
export class GetFavoritesQrsUseCase {
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
    role: string,
    userId2: string,
    tracking: TrackingContext,
  ): Promise<{ data: unknown[]; pagination: QrPagination }> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'GetFavoritesQrsUseCase - input', {
      userId,
      page,
      limit,
      search,
      role,
    });
    return this.reader.findUserByFavorites(userId, page, limit, search, role, userId2, tracking);
  }
}
