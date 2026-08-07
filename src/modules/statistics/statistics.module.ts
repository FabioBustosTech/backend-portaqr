import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from 'src/common/common.module';
import { StatisticsController } from './presentation/controllers/statistics.controller';

import { ScanSchema, ScanSchemaDefinition } from 'src/modules/scan/infrastructure/repository/mongo/schemas/scan.schema';
import { QrSchema, QrSchemaDefinition } from 'src/modules/qr/infrastructure/repository/mongo/schemas/qr.schema';
import { UserSchema, UserSchemaDefinition } from 'src/modules/users/infrastructure/repository/mongo/schemas/user.schema';

import { MongoStatisticsRepository } from './infrastructure/repository/mongo/mongo-statistics.repository';
import { StatisticsRepositoryAdapter } from './infrastructure/adapters/StatisticsRepositoryAdapter';

import { GetUserStatisticsUseCase } from './application/use-cases/get-user-statistics.usecase';
import { GetSystemStatisticsUseCase } from './application/use-cases/get-system-statistics.usecase';

import { STATISTICS_GET_PORT } from './domain/constants/statistics.tokens';

@Module({
  imports: [
    CommonModule,
    MongooseModule.forFeature([
      { name: ScanSchema.name, schema: ScanSchemaDefinition },
      { name: QrSchema.name, schema: QrSchemaDefinition },
      { name: UserSchema.name, schema: UserSchemaDefinition },
    ]),
  ],
  controllers: [StatisticsController],
  providers: [
    // Use Cases
    GetUserStatisticsUseCase,
    GetSystemStatisticsUseCase,

    // Repositories
    MongoStatisticsRepository,
    StatisticsRepositoryAdapter,

    // Puertos segregados (ISP)
    {
      provide: STATISTICS_GET_PORT,
      useClass: StatisticsRepositoryAdapter,
    },
  ],
  exports: [GetUserStatisticsUseCase, GetSystemStatisticsUseCase],
})
export class StatisticsModule {}
