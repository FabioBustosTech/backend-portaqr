import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ICanGetPlan } from '../../domain/ports/queries/plan.port';
import type { Plan } from '../../domain/entities/plan.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { PLAN_GET_PORT } from '../../domain/constants/plan.tokens';

@Injectable()
export class GetPlanUseCase {
  constructor(
    @Inject(PLAN_GET_PORT)
    private readonly reader: ICanGetPlan,
    private readonly traceService: TraceService,
  ) {}

  async execute(id: string, tracking: TrackingContext): Promise<Plan> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'GetPlanUseCase - input', { id });

    const plan = await this.reader.getById(id, tracking);
    if (!plan) {
      this.traceService.warn(tracking, TraceLayer.USE_CASE, 'GetPlanUseCase - not found', { id });
      throw new NotFoundException(`Plan con ID ${id} no encontrado`);
    }
    return plan;
  }
}
