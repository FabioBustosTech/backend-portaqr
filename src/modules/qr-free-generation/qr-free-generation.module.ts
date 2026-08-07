import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from 'src/common/common.module';
import { QrFreeGenerationController } from './presentation/controllers/qr-free-generation.controller';

import {
  QrFreeGenerationSchema,
  QrFreeGenerationSchemaDefinition,
} from './infrastructure/repository/mongo/schemas/qr-free-generation.schema';
import { MongoQrFreeGenerationRepository } from './infrastructure/repository/mongo/mongo-qr-free-generation.repository';
import { QrFreeGenerationRepositoryAdapter } from './infrastructure/adapters/QrFreeGenerationRepositoryAdapter';

import { CreateQrFreeGenerationUseCase } from './application/use-cases/create-qr-free-generation.usecase';
import { GetAllQrFreeGenerationUseCase } from './application/use-cases/get-all-qr-free-generation.usecase';
import { GetQrFreeGenerationUseCase } from './application/use-cases/get-qr-free-generation.usecase';

import {
  QR_FREE_GENERATION_CREATE_PORT,
  QR_FREE_GENERATION_GET_ALL_PORT,
  QR_FREE_GENERATION_GET_PORT,
} from './domain/constants/qr-free-generation.tokens';

@Module({
  imports: [
    CommonModule,
    MongooseModule.forFeature([
      { name: QrFreeGenerationSchema.name, schema: QrFreeGenerationSchemaDefinition },
    ]),
  ],
  controllers: [QrFreeGenerationController],
  providers: [
    // Use Cases
    CreateQrFreeGenerationUseCase,
    GetAllQrFreeGenerationUseCase,
    GetQrFreeGenerationUseCase,

    // Repositories
    MongoQrFreeGenerationRepository,
    QrFreeGenerationRepositoryAdapter,

    // Puertos segregados (ISP)
    {
      provide: QR_FREE_GENERATION_CREATE_PORT,
      useClass: QrFreeGenerationRepositoryAdapter,
    },
    {
      provide: QR_FREE_GENERATION_GET_ALL_PORT,
      useClass: QrFreeGenerationRepositoryAdapter,
    },
    {
      provide: QR_FREE_GENERATION_GET_PORT,
      useClass: QrFreeGenerationRepositoryAdapter,
    },
  ],
  exports: [
    CreateQrFreeGenerationUseCase,
    GetAllQrFreeGenerationUseCase,
    GetQrFreeGenerationUseCase,
  ],
})
export class QrFreeGenerationModule {}
