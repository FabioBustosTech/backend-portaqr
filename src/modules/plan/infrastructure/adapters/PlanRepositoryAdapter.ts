import { Injectable, NotFoundException } from '@nestjs/common';
import type { Plan, PaginatedPlans } from '../../domain/entities/plan.entity';
import type {
  ICanCreatePlan,
  ICanGetAllPlan,
  ICanGetPlan,
  ICanUpdatePlan,
  ICanDeletePlan,
} from '../../domain/ports/queries/plan.port';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { MongoPlanRepository } from '../repository/mongo/mongo-plan.repository';

@Injectable()
export class PlanRepositoryAdapter
  implements ICanCreatePlan, ICanGetAllPlan, ICanGetPlan, ICanUpdatePlan, ICanDeletePlan
{
  constructor(private readonly mongoRepository: MongoPlanRepository) {}

  async create(plan: Plan, tracking: TrackingContext): Promise<Plan> {
    return this.mongoRepository.create(plan, tracking);
  }

  async getAll(
    page: number,
    limit: number,
    search: string,
    tracking: TrackingContext,
  ): Promise<PaginatedPlans> {
    return this.mongoRepository.getAll(page, limit, search, tracking);
  }

  async getById(id: string, tracking: TrackingContext): Promise<Plan | null> {
    return this.mongoRepository.getById(id, tracking);
  }

  async update(
    id: string,
    data: Partial<Plan>,
    tracking: TrackingContext,
  ): Promise<Plan | null> {
    return this.mongoRepository.update(id, data, tracking);
  }

  async remove(id: string, tracking: TrackingContext): Promise<boolean> {
    return this.mongoRepository.remove(id, tracking);
  }
}
