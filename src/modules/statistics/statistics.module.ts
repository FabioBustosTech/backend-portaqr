import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from 'src/common/common.module';
import { StatisticsController } from './presentation/controllers/statistics.controller';

import { Scan, ScanSchema } from 'src/scan/entities/scan.entity';
import { Qr, QrSchema } from 'src/qr/entities/qr.entity';
import { User, UserSchema } from 'src/users/entities/user.entity';

import { MongoStatisticsRepository } from './infrastructure/repository/mongo/mongo-statistics.repository';
import { StatisticsRepositoryAdapter } from './infrastructure/adapters/StatisticsRepositoryAdapter';

import { GetUserStatisticsUseCase } from './application/use-cases/get-user-statistics.usecase';
import { GetSystemStatisticsUseCase } from './application/use-cases/get-system-statistics.usecase';

import { STATISTICS_GET_PORT } from './domain/constants/statistics.tokens';

@Module({
  imports: [
    CommonModule,
    MongooseModule.forFeature([
      { name: Scan.name, schema: ScanSchema },
      { name: Qr.name, schema: QrSchema },
      { name: User.name, schema: UserSchema },
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
