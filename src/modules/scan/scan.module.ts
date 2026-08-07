import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from 'src/common/common.module';
import { ScanController } from './presentation/controllers/scan.controller';

import {
  ScanSchema,
  ScanSchemaDefinition,
} from './infrastructure/repository/mongo/schemas/scan.schema';
import { MongoScanRepository } from './infrastructure/repository/mongo/mongo-scan.repository';
import { ScanRepositoryAdapter } from './infrastructure/adapters/ScanRepositoryAdapter';

import { CreateScanUseCase } from './application/use-cases/create-scan.usecase';
import { GetScanStatsUseCase } from './application/use-cases/get-scan-stats.usecase';
import { GetRecentScansUseCase } from './application/use-cases/get-recent-scans.usecase';
import { GetDailyScanStatsUseCase } from './application/use-cases/get-daily-scan-stats.usecase';
import { GetLocationScanStatsUseCase } from './application/use-cases/get-location-scan-stats.usecase';
import { GetDeviceScanStatsUseCase } from './application/use-cases/get-device-scan-stats.usecase';
import { GetOriginScanStatsUseCase } from './application/use-cases/get-origin-scan-stats.usecase';

import { SCAN_CREATE_PORT, SCAN_GET_PORT } from './domain/constants/scan.tokens';

@Module({
  imports: [
    CommonModule,
    MongooseModule.forFeature([
      { name: ScanSchema.name, schema: ScanSchemaDefinition },
    ]),
  ],
  controllers: [ScanController],
  providers: [
    // Use Cases
    CreateScanUseCase,
    GetScanStatsUseCase,
    GetRecentScansUseCase,
    GetDailyScanStatsUseCase,
    GetLocationScanStatsUseCase,
    GetDeviceScanStatsUseCase,
    GetOriginScanStatsUseCase,

    // Repositories
    MongoScanRepository,
    ScanRepositoryAdapter,

    // Puertos segregados (ISP)
    {
      provide: SCAN_CREATE_PORT,
      useClass: ScanRepositoryAdapter,
    },
    {
      provide: SCAN_GET_PORT,
      useClass: ScanRepositoryAdapter,
    },
  ],
  exports: [
    CreateScanUseCase,
    GetScanStatsUseCase,
    GetRecentScansUseCase,
    GetDailyScanStatsUseCase,
    GetLocationScanStatsUseCase,
    GetDeviceScanStatsUseCase,
    GetOriginScanStatsUseCase,
  ],
})
export class ScanModule {}
