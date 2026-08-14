import { Injectable, Inject } from '@nestjs/common';
import type { ICanGetAllQr, QrPagination } from '../../domain/ports/queries/qr.port';
import type { Qr } from '../../domain/entities/qr.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { QR_GET_ALL_PORT } from '../../domain/constants/qr.tokens';

@Injectable()
export class GetAllQrUseCase {
  constructor(
    @Inject(QR_GET_ALL_PORT)
    private readonly reader: ICanGetAllQr,
    private readonly traceService: TraceService,
  ) {}

  /** GET /qr (todos los QRs sin paginación) */
  async executeAll(tracking: TrackingContext): Promise<Qr[]> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'GetAllQrUseCase - all');
    return this.reader.getAll(tracking);
  }

  /** GET /qr con búsqueda, paginación y filtros admin (SPEC-015) */
  async execute(
    page: number,
    limit: number,
    search: string,
    active: string = 'all',
    type: string | undefined,
    userId: string | undefined,
    tracking: TrackingContext,
  ): Promise<{ data: Qr[]; pagination: QrPagination }> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'GetAllQrUseCase - input', {
      page,
      limit,
      search,
      active,
      type,
      userId,
    });
    return this.reader.findAllWithSearch(page, limit, search, active, type, userId, tracking);
  }
}
