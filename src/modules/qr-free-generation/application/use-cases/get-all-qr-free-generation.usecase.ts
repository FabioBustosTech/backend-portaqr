import { Injectable, Inject } from '@nestjs/common';
import type { ICanGetAllQrFreeGeneration } from '../../domain/ports/queries/qr-free-generation.port';
import type { PaginatedQrFreeGenerations } from '../../domain/entities/qr-free-generation.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { QR_FREE_GENERATION_GET_ALL_PORT } from '../../domain/constants/qr-free-generation.tokens';

@Injectable()
export class GetAllQrFreeGenerationUseCase {
  constructor(
    @Inject(QR_FREE_GENERATION_GET_ALL_PORT)
    private readonly reader: ICanGetAllQrFreeGeneration,
    private readonly traceService: TraceService,
  ) {}

  async execute(
    page: number,
    limit: number,
    search: string,
    tracking: TrackingContext,
  ): Promise<PaginatedQrFreeGenerations> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'GetAllQrFreeGenerationUseCase - input', {
      page,
      limit,
      search,
    });
    return this.reader.getAll(page, limit, search, tracking);
  }
}
