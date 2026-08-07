import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from '../../common/common.module';
import { WebpayController } from './presentation/controllers/webpay.controller';

import {
  TransactionSchema,
  TransactionSchemaDefinition,
} from './infrastructure/repository/mongo/schemas/transaction.schema';
import { MongoTransactionRepository } from './infrastructure/repository/mongo/mongo-transaction.repository';
import { TransactionRepositoryAdapter } from './infrastructure/adapters/TransactionRepositoryAdapter';
import { TransbankWebpayGateway } from './infrastructure/adapters/transbank-webpay.gateway';

import { CreateTransactionUseCase } from './application/use-cases/create-transaction.usecase';
import { CommitTransactionUseCase } from './application/use-cases/commit-transaction.usecase';
import { RefundTransactionUseCase } from './application/use-cases/refund-transaction.usecase';
import { GetTransactionStatusUseCase } from './application/use-cases/get-transaction-status.usecase';

import {
  TRANSACTION_CREATE_PORT,
  TRANSACTION_GET_PORT,
  TRANSACTION_UPDATE_PORT,
  WEBPAY_GATEWAY_PORT,
} from './domain/constants/webpay.tokens';

@Module({
  imports: [
    CommonModule,
    MongooseModule.forFeature([
      { name: TransactionSchema.name, schema: TransactionSchemaDefinition },
    ]),
  ],
  controllers: [WebpayController],
  providers: [
    // Use Cases
    CreateTransactionUseCase,
    CommitTransactionUseCase,
    RefundTransactionUseCase,
    GetTransactionStatusUseCase,

    // Repositories (Infrastructure)
    MongoTransactionRepository,
    TransactionRepositoryAdapter,

    // Gateway externo
    TransbankWebpayGateway,

    // Puertos
    {
      provide: TRANSACTION_CREATE_PORT,
      useClass: TransactionRepositoryAdapter,
    },
    {
      provide: TRANSACTION_GET_PORT,
      useClass: TransactionRepositoryAdapter,
    },
    {
      provide: TRANSACTION_UPDATE_PORT,
      useClass: TransactionRepositoryAdapter,
    },
    {
      provide: WEBPAY_GATEWAY_PORT,
      useClass: TransbankWebpayGateway,
    },
  ],
  exports: [
    CommitTransactionUseCase,
    CreateTransactionUseCase,
    TRANSACTION_CREATE_PORT,
    TRANSACTION_GET_PORT,
    TRANSACTION_UPDATE_PORT,
    WEBPAY_GATEWAY_PORT,
  ],
})
export class WebpayModule {}
