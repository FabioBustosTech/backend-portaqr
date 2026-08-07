import { Injectable, Inject } from '@nestjs/common';
import type { ICanGetAllPlan } from '../../domain/ports/queries/plan.port';
import type { PaginatedPlans } from '../../domain/entities/plan.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { PLAN_GET_ALL_PORT } from '../../domain/constants/plan.tokens';

@Injectable()
export class GetAllPlanUseCase {
  constructor(
    @Inject(PLAN_GET_ALL_PORT)
    private readonly reader: ICanGetAllPlan,
    private readonly traceService: TraceService,
  ) {}

  async execute(
    page: number,
    limit: number,
    search: string,
    tracking: TrackingContext,
  ): Promise<PaginatedPlans> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'GetAllPlanUseCase - input', {
      page,
      limit,
      search,
    });
    return this.reader.getAll(page, limit, search, tracking);
  }
}
