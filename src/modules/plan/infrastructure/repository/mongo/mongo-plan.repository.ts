import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import type { Plan, PaginatedPlans } from '../../../domain/entities/plan.entity';
import type {
  ICanCreatePlan,
  ICanGetAllPlan,
  ICanGetPlan,
  ICanUpdatePlan,
  ICanDeletePlan,
} from '../../../domain/ports/queries/plan.port';
import { PlanSchema, PlanDocument } from './schemas/plan.schema';
import { PlanMongoMapper } from './mappers/plan-mongo.mapper';
// SPEC-008 H3 (R2): input de búsqueda como literal, sin metacaracteres de regex (ReDoS)
import escapeStringRegexp = require('escape-string-regexp');

@Injectable()
export class MongoPlanRepository
  implements ICanCreatePlan, ICanGetAllPlan, ICanGetPlan, ICanUpdatePlan, ICanDeletePlan
{
  private readonly logger = new Logger(MongoPlanRepository.name);

  constructor(
    @InjectModel(PlanSchema.name)
    private readonly planModel: Model<PlanDocument>,
    private readonly traceService: TraceService,
  ) {}

  async create(plan: Plan, tracking: TrackingContext): Promise<Plan> {
    try {
      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'create:init', {
        name: plan.name,
      });
      const newPlan = new this.planModel(PlanMongoMapper.toSchemaData(plan));
      const savedPlan = await newPlan.save();
      return PlanMongoMapper.toEntity(savedPlan);
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'create:error', error as Error);
      throw error;
    }
  }

  async getAll(
    page: number,
    limit: number,
    search: string,
    tracking: TrackingContext,
  ): Promise<PaginatedPlans> {
    try {
      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'getAll:init', {
        page,
        limit,
        search,
      });

      const query: any = {};
      if (search) {
        // SPEC-008 H3 (R2): input como literal antes de $regex (anti-ReDoS)
        const safeSearch = escapeStringRegexp(search);
        query.$or = [
          { name: { $regex: safeSearch, $options: 'i' } },
          { description: { $regex: safeSearch, $options: 'i' } },
          { typeQr: { $regex: safeSearch, $options: 'i' } },
        ];
      }

      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        this.planModel
          .find(query)
          .sort({ createdDate: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.planModel.countDocuments(query),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: data.map((doc) => PlanMongoMapper.toEntity(doc)),
        pagination: {
          total,
          totalPages,
          currentPage: page,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'getAll:error', error as Error);
      throw error;
    }
  }

  async getById(id: string, tracking: TrackingContext): Promise<Plan | null> {
    try {
      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'getById:init', { id });
      const plan = await this.planModel.findById(id).lean().exec();
      if (!plan) {
        return null;
      }
      return PlanMongoMapper.toEntity(plan);
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'getById:error', error as Error);
      throw error;
    }
  }

  async update(
    id: string,
    data: Partial<Plan>,
    tracking: TrackingContext,
  ): Promise<Plan | null> {
    try {
      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'update:init', { id });
      const updatedPlan = await this.planModel
        .findByIdAndUpdate(id, { $set: PlanMongoMapper.toSchemaData(data) }, { new: true })
        .lean()
        .exec();

      if (!updatedPlan) {
        return null;
      }
      return PlanMongoMapper.toEntity(updatedPlan);
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'update:error', error as Error);
      throw error;
    }
  }

  async remove(id: string, tracking: TrackingContext): Promise<boolean> {
    try {
      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'remove:init', { id });
      const result = await this.planModel.findByIdAndDelete(id).exec();
      return !!result;
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'remove:error', error as Error);
      throw error;
    }
  }
}
