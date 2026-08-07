import { Injectable } from '@nestjs/common';
import type { WebpayTransaction } from '../../domain/entities/webpay-transaction.entity';
import type { ICanCreateTransaction, ICanGetTransaction, ICanUpdateTransaction } from '../../domain/ports/queries/transaction.port';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { MongoTransactionRepository } from '../repository/mongo/mongo-transaction.repository';

@Injectable()
export class TransactionRepositoryAdapter
  implements ICanCreateTransaction, ICanGetTransaction, ICanUpdateTransaction
{
  constructor(private readonly mongoRepository: MongoTransactionRepository) {}

  async create(
    transaction: WebpayTransaction,
    tracking: TrackingContext,
  ): Promise<WebpayTransaction> {
    return this.mongoRepository.create(transaction, tracking);
  }

  async getByToken(
    token: string,
    tracking: TrackingContext,
  ): Promise<WebpayTransaction | null> {
    return this.mongoRepository.getByToken(token, tracking);
  }

  async updateByToken(
    token: string,
    data: Partial<WebpayTransaction>,
    tracking: TrackingContext,
  ): Promise<WebpayTransaction | null> {
    return this.mongoRepository.updateByToken(token, data, tracking);
  }
}
