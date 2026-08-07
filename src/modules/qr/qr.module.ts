import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from 'src/common/common.module';
import { QrController } from './presentation/controllers/qr.controller';

import {
  QrSchema,
  QrSchemaDefinition,
} from './infrastructure/repository/mongo/schemas/qr.schema';
import { MongoQrRepository } from './infrastructure/repository/mongo/mongo-qr.repository';
import { QrRepositoryAdapter } from './infrastructure/adapters/QrRepositoryAdapter';
import { PetTag, PetTagSchema } from 'src/pet-tag/entities/pet-tag.entity';

import { CreateQrUseCase } from './application/use-cases/create-qr.usecase';
import { GetAllQrUseCase } from './application/use-cases/get-all-qr.usecase';
import { GetQrUseCase } from './application/use-cases/get-qr.usecase';
import { GetQrsByUserUseCase } from './application/use-cases/get-qrs-by-user.usecase';
import { GetPaginatedQrsByUserUseCase } from './application/use-cases/get-paginated-qrs-by-user.usecase';
import { GetFavoritesQrsUseCase } from './application/use-cases/get-favorites-qrs.usecase';
import { GetRecentActiveQrUseCase } from './application/use-cases/get-recent-active-qr.usecase';
import { GetPublicQrUseCase } from './application/use-cases/get-public-qr.usecase';
import { UpdateQrUseCase } from './application/use-cases/update-qr.usecase';
import { DeleteQrUseCase } from './application/use-cases/delete-qr.usecase';

import {
  QR_GET_ALL_PORT,
  QR_GET_PORT,
  QR_CREATE_PORT,
  QR_UPDATE_PORT,
  QR_DELETE_PORT,
} from './domain/constants/qr.tokens';

@Module({
  imports: [
    CommonModule,
    MongooseModule.forFeature([
      { name: QrSchema.name, schema: QrSchemaDefinition },
      { name: PetTag.name, schema: PetTagSchema },
    ]),
  ],
  controllers: [QrController],
  providers: [
    // Use Cases
    CreateQrUseCase,
    GetAllQrUseCase,
    GetQrUseCase,
    GetQrsByUserUseCase,
    GetPaginatedQrsByUserUseCase,
    GetFavoritesQrsUseCase,
    GetRecentActiveQrUseCase,
    GetPublicQrUseCase,
    UpdateQrUseCase,
    DeleteQrUseCase,

    // Repositories
    MongoQrRepository,
    QrRepositoryAdapter,

    // Puertos segregados (ISP)
    {
      provide: QR_GET_ALL_PORT,
      useClass: QrRepositoryAdapter,
    },
    {
      provide: QR_GET_PORT,
      useClass: QrRepositoryAdapter,
    },
    {
      provide: QR_CREATE_PORT,
      useClass: QrRepositoryAdapter,
    },
    {
      provide: QR_UPDATE_PORT,
      useClass: QrRepositoryAdapter,
    },
    {
      provide: QR_DELETE_PORT,
      useClass: QrRepositoryAdapter,
    },
  ],
  exports: [
    CreateQrUseCase,
    GetAllQrUseCase,
    GetQrUseCase,
    GetQrsByUserUseCase,
    GetPaginatedQrsByUserUseCase,
    GetFavoritesQrsUseCase,
    GetRecentActiveQrUseCase,
    GetPublicQrUseCase,
    UpdateQrUseCase,
    DeleteQrUseCase,
  ],
})
export class QrModule {}
