import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TraceService, TraceLayer } from '../../../../../common/services/trace.service';
import type { WebpayTransaction } from '../../../domain/entities/webpay-transaction.entity';
import type { ICanCreateTransaction, ICanGetTransaction, ICanUpdateTransaction } from '../../../domain/ports/queries/transaction.port';
import { TransactionSchema, TransactionDocument } from './schemas/transaction.schema';
import { WebpayTransactionMongoMapper } from './mappers/webpay-transaction-mongo.mapper';
import type { TrackingContext } from '../../../../../common/decorators/tracking.decorator';

@Injectable()
export class MongoTransactionRepository
  implements ICanCreateTransaction, ICanGetTransaction, ICanUpdateTransaction
{
  private readonly logger = new Logger(MongoTransactionRepository.name);

  constructor(
    @InjectModel(TransactionSchema.name)
    private readonly transactionModel: Model<TransactionDocument>,
    private readonly traceService: TraceService,
  ) {}

  async create(
    transaction: WebpayTransaction,
    tracking: TrackingContext,
  ): Promise<WebpayTransaction> {
    try {
      const nuevo = new this.transactionModel(WebpayTransactionMongoMapper.toSchemaData(transaction));
      const saved = await nuevo.save();
      return WebpayTransactionMongoMapper.toEntity(saved);
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'create:error', error as Error);
      throw error;
    }
  }

  async getByToken(
    token: string,
    tracking: TrackingContext,
  ): Promise<WebpayTransaction | null> {
    try {
      const tx = await this.transactionModel.findOne({ token }).exec();
      return tx ? WebpayTransactionMongoMapper.toEntity(tx) : null;
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'getByToken:error', error as Error);
      throw error;
    }
  }

  async updateByToken(
    token: string,
    data: Partial<WebpayTransaction>,
    tracking: TrackingContext,
  ): Promise<WebpayTransaction | null> {
    try {
      const updated = await this.transactionModel
        .findOneAndUpdate({ token }, { $set: WebpayTransactionMongoMapper.toSchemaData(data) }, { new: true })
        .exec();
      return updated ? WebpayTransactionMongoMapper.toEntity(updated) : null;
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'updateByToken:error', error as Error);
      throw error;
    }
  }
}
