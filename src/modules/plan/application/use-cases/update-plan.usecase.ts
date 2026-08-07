import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ICanUpdatePlan } from '../../domain/ports/queries/plan.port';
import type { Plan } from '../../domain/entities/plan.entity';
import { UpdatePlanDto } from '../dto/update-plan.dto';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { PLAN_UPDATE_PORT } from '../../domain/constants/plan.tokens';

@Injectable()
export class UpdatePlanUseCase {
  constructor(
    @Inject(PLAN_UPDATE_PORT)
    private readonly updater: ICanUpdatePlan,
    private readonly traceService: TraceService,
  ) {}

  async execute(
    id: string,
    dto: UpdatePlanDto,
    tracking: TrackingContext,
  ): Promise<Plan> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'UpdatePlanUseCase - input', { id });

    const updated = await this.updater.update(id, dto, tracking);
    if (!updated) {
      this.traceService.warn(tracking, TraceLayer.USE_CASE, 'UpdatePlanUseCase - not found', { id });
      throw new NotFoundException(`Plan con ID ${id} no encontrado`);
    }
    return updated;
  }
}
