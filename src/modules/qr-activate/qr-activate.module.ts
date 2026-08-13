import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from '../../common/common.module';
import { WebpayModule } from '../webpay/webpay.module';
import { QrModule } from '../qr/qr.module';
import { PlanModule } from '../plan/plan.module'; // SPEC-009 B12: precio desde el plan
import { QrActivateController } from './presentation/controllers/qr-activate.controller';

import {
  QrActivateSchema,
  QrActivateSchemaDefinition,
} from './infrastructure/repository/mongo/schemas/qr-activate.schema';
import { MongoQrActivateRepository } from './infrastructure/repository/mongo/mongo-qr-activate.repository';
import { QrActivateRepositoryAdapter } from './infrastructure/adapters/QrActivateRepositoryAdapter';
import { QrActivateQrAdapter } from './infrastructure/adapters/QrActivateQrAdapter';

import { CreateQrActivateUseCase } from './application/use-cases/create-qr-activate.usecase';
import { GetAllQrActivateUseCase } from './application/use-cases/get-all-qr-activate.usecase';
import { GetQrActivateUseCase } from './application/use-cases/get-qr-activate.usecase';
import { UpdateQrActivateUseCase } from './application/use-cases/update-qr-activate.usecase';
import { UpdateWebpayQrActivateUseCase } from './application/use-cases/update-webpay-qr-activate.usecase';
import { DeleteQrActivateUseCase } from './application/use-cases/delete-qr-activate.usecase';

import {
  QR_ACTIVATE_CREATE_PORT,
  QR_ACTIVATE_GET_PORT,
  QR_ACTIVATE_UPDATE_PORT,
  QR_ACTIVATE_DELETE_PORT,
  QR_ACTIVATE_QR_PORT,
} from './domain/constants/qr-activate.tokens';

@Module({
  imports: [
    CommonModule,
    WebpayModule,
    QrModule,
    PlanModule, // SPEC-009 B12: provee GetPlanUseCase para el cálculo del snapshot
    MongooseModule.forFeature([
      { name: QrActivateSchema.name, schema: QrActivateSchemaDefinition },
    ]),
  ],
  controllers: [QrActivateController],
  providers: [
    // Use Cases
    CreateQrActivateUseCase,
    GetAllQrActivateUseCase,
    GetQrActivateUseCase,
    UpdateQrActivateUseCase,
    UpdateWebpayQrActivateUseCase,
    DeleteQrActivateUseCase,

    // Repositories
    MongoQrActivateRepository,
    QrActivateRepositoryAdapter,
    QrActivateQrAdapter,

    // Puertos
    {
      provide: QR_ACTIVATE_CREATE_PORT,
      useClass: QrActivateRepositoryAdapter,
    },
    {
      provide: QR_ACTIVATE_GET_PORT,
      useClass: QrActivateRepositoryAdapter,
    },
    {
      provide: QR_ACTIVATE_UPDATE_PORT,
      useClass: QrActivateRepositoryAdapter,
    },
    {
      provide: QR_ACTIVATE_DELETE_PORT,
      useClass: QrActivateRepositoryAdapter,
    },
    {
      provide: QR_ACTIVATE_QR_PORT,
      useClass: QrActivateQrAdapter,
    },
  ],
  exports: [CreateQrActivateUseCase, GetQrActivateUseCase],
})
export class QrActivateModule {}
