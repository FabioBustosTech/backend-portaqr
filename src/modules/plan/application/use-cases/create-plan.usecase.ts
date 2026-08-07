import { Injectable, Inject } from '@nestjs/common';
import type { ICanCreatePlan } from '../../domain/ports/queries/plan.port';
import { PlanEntity } from '../../domain/entities/plan.entity';
import type { Plan } from '../../domain/entities/plan.entity';
import { CreatePlanDto } from '../dto/create-plan.dto';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { PLAN_CREATE_PORT } from '../../domain/constants/plan.tokens';

@Injectable()
export class CreatePlanUseCase {
  constructor(
    @Inject(PLAN_CREATE_PORT)
    private readonly creator: ICanCreatePlan,
    private readonly traceService: TraceService,
  ) {}

  async execute(dto: CreatePlanDto, tracking: TrackingContext): Promise<Plan> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'CreatePlanUseCase - input', {
      name: dto.name,
      price: dto.price,
    });

    const plan = new PlanEntity({ ...dto });

    const saved = await this.creator.create(plan, tracking);
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'CreatePlanUseCase - created', {
      id: saved.id,
      name: saved.name,
    });
    return saved;
  }
}
