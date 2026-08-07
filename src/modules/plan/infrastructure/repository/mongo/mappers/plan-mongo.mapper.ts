import type { Plan } from '../../../../domain/entities/plan.entity';
import type { PlanSchema } from '../schemas/plan.schema';

export class PlanMongoMapper {
  static toEntity(doc: PlanSchema & { _id?: unknown }): Plan {
    return {
      id: doc._id?.toString() || '',
      name: doc.name,
      description: doc.description,
      status: doc.status,
      endDate: doc.endDate,
      updatedDate: doc.updatedDate,
      createdDate: doc.createdDate,
      details: doc.details,
      price: doc.price,
      active: doc.active,
      populier: doc.populier,
      free: doc.free,
      detailDuration: doc.detailDuration,
      typeQr: doc.typeQr,
      createdAt: doc.createdDate,
      updatedAt: doc.updatedDate,
    };
  }

  static toSchemaData(plan: Partial<Plan>): Partial<PlanSchema> {
    return {
      name: plan.name,
      description: plan.description,
      status: plan.status,
      endDate: plan.endDate,
      updatedDate: plan.updatedDate,
      createdDate: plan.createdDate,
      details: plan.details,
      price: plan.price,
      active: plan.active,
      populier: plan.populier,
      free: plan.free,
      detailDuration: plan.detailDuration,
      typeQr: plan.typeQr,
    };
  }
}
