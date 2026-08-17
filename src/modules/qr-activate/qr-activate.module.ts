import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from '../../common/common.module';
import { EmailModule } from '../../shared/email/email.module'; // SPEC-019: provee EmailService (implementa el puerto)
import { EmailService } from '../../shared/email/email.service';
import { WebpayModule } from '../webpay/webpay.module';
import { QrModule } from '../qr/qr.module';
import { PlanModule } from '../plan/plan.module'; // SPEC-009 B12: precio desde el plan
import { UsersModule } from '../users/users.module'; // SPEC-019: provee GetUserUseCase (destinatario del correo)
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
import { QrActivatedNotificationService } from './application/services/qr-activated-notification.service'; // SPEC-019

import {
  QR_ACTIVATE_CREATE_PORT,
  QR_ACTIVATE_GET_PORT,
  QR_ACTIVATE_UPDATE_PORT,
  QR_ACTIVATE_DELETE_PORT,
  QR_ACTIVATE_QR_PORT,
  QR_ACTIVATE_EMAIL_PORT, // SPEC-019 ADR-019.8
} from './domain/constants/qr-activate.tokens';

@Module({
  imports: [
    CommonModule,
    WebpayModule,
    QrModule,
    PlanModule, // SPEC-009 B12: provee GetPlanUseCase para el cálculo del snapshot
    UsersModule, // SPEC-019: provee GetUserUseCase (destinatario del correo de activación)
    EmailModule, // SPEC-019: provee EmailService (implementa ICanSendQrActivatedEmail)
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

    // Servicios de aplicación (SPEC-019)
    QrActivatedNotificationService,

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
    // SPEC-019 ADR-019.8: EmailService implementa estructuralmente el puerto de correo
    {
      provide: QR_ACTIVATE_EMAIL_PORT,
      useExisting: EmailService,
    },
  ],
  exports: [CreateQrActivateUseCase, GetQrActivateUseCase],
})
export class QrActivateModule {}
