import { Injectable, Inject } from '@nestjs/common';
import type { ICanGetQrActivate } from '../../domain/ports/queries/qr-activate.port';
import type { QrActivate } from '../../domain/entities/qr-activate.entity';
import type { PaginatedResult } from '../../../../common/dto/pagination.dto';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { QR_ACTIVATE_GET_PORT } from '../../domain/constants/qr-activate.tokens';

@Injectable()
export class GetAllQrActivateUseCase {
  constructor(
    @Inject(QR_ACTIVATE_GET_PORT)
    private readonly reader: ICanGetQrActivate,
    private readonly traceService: TraceService,
  ) {}

  async execute(
    page: number,
    limit: number,
    search: string | undefined,
    methodActivation: string | undefined,
    userId: string | undefined,
    tracking: TrackingContext,
  ): Promise<PaginatedResult<QrActivate>> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'GetAllQrActivateUseCase', {
      page,
      limit,
      search,
      methodActivation,
      // SPEC-009 A3: userId se loguea solo si viene (filtro de ownership)
      ...(userId ? { userId } : {}),
    });
    return this.reader.getAll(page, limit, search, methodActivation, userId, tracking);
  }
}
