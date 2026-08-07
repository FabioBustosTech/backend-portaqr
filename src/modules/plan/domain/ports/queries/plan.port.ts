import type { Plan, PaginatedPlans } from '../../entities/plan.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';

export interface ICanCreatePlan {
  create(plan: Plan, tracking: TrackingContext): Promise<Plan>;
}

export interface ICanGetAllPlan {
  getAll(
    page: number,
    limit: number,
    search: string,
    tracking: TrackingContext,
  ): Promise<PaginatedPlans>;
}

export interface ICanGetPlan {
  getById(id: string, tracking: TrackingContext): Promise<Plan | null>;
}

export interface ICanUpdatePlan {
  update(
    id: string,
    data: Partial<Plan>,
    tracking: TrackingContext,
  ): Promise<Plan | null>;
}

export interface ICanDeletePlan {
  remove(id: string, tracking: TrackingContext): Promise<boolean>;
}
