import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from 'src/common/common.module';
import { PlanController } from './presentation/controllers/plan.controller';

import {
  PlanSchema,
  PlanSchemaDefinition,
} from './infrastructure/repository/mongo/schemas/plan.schema';
import { MongoPlanRepository } from './infrastructure/repository/mongo/mongo-plan.repository';
import { PlanRepositoryAdapter } from './infrastructure/adapters/PlanRepositoryAdapter';

import { CreatePlanUseCase } from './application/use-cases/create-plan.usecase';
import { GetAllPlanUseCase } from './application/use-cases/get-all-plan.usecase';
import { GetPlanUseCase } from './application/use-cases/get-plan.usecase';
import { UpdatePlanUseCase } from './application/use-cases/update-plan.usecase';
import { DeletePlanUseCase } from './application/use-cases/delete-plan.usecase';

import {
  PLAN_CREATE_PORT,
  PLAN_GET_ALL_PORT,
  PLAN_GET_PORT,
  PLAN_UPDATE_PORT,
  PLAN_DELETE_PORT,
} from './domain/constants/plan.tokens';

@Module({
  imports: [
    CommonModule,
    MongooseModule.forFeature([
      { name: PlanSchema.name, schema: PlanSchemaDefinition },
      // Alias 'Plan' para que los refs 'Plan' de qr-activate resuelvan el populate
      { name: 'Plan', schema: PlanSchemaDefinition },
    ]),
  ],
  controllers: [PlanController],
  providers: [
    // Use Cases
    CreatePlanUseCase,
    GetAllPlanUseCase,
    GetPlanUseCase,
    UpdatePlanUseCase,
    DeletePlanUseCase,

    // Repositories
    MongoPlanRepository,
    PlanRepositoryAdapter,

    // Puertos segregados (ISP)
    {
      provide: PLAN_CREATE_PORT,
      useClass: PlanRepositoryAdapter,
    },
    {
      provide: PLAN_GET_ALL_PORT,
      useClass: PlanRepositoryAdapter,
    },
    {
      provide: PLAN_GET_PORT,
      useClass: PlanRepositoryAdapter,
    },
    {
      provide: PLAN_UPDATE_PORT,
      useClass: PlanRepositoryAdapter,
    },
    {
      provide: PLAN_DELETE_PORT,
      useClass: PlanRepositoryAdapter,
    },
  ],
  exports: [
    CreatePlanUseCase,
    GetAllPlanUseCase,
    GetPlanUseCase,
    UpdatePlanUseCase,
    DeletePlanUseCase,
  ],
})
export class PlanModule {}
