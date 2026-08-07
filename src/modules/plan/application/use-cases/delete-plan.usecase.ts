import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ICanDeletePlan } from '../../domain/ports/queries/plan.port';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { PLAN_DELETE_PORT } from '../../domain/constants/plan.tokens';

@Injectable()
export class DeletePlanUseCase {
  constructor(
    @Inject(PLAN_DELETE_PORT)
    private readonly deleter: ICanDeletePlan,
    private readonly traceService: TraceService,
  ) {}

  async execute(id: string, tracking: TrackingContext): Promise<void> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'DeletePlanUseCase - input', { id });

    const deleted = await this.deleter.remove(id, tracking);
    if (!deleted) {
      this.traceService.warn(tracking, TraceLayer.USE_CASE, 'DeletePlanUseCase - not found', { id });
      throw new NotFoundException(`Plan con ID ${id} no encontrado`);
    }
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'DeletePlanUseCase - deleted', { id });
  }
}
