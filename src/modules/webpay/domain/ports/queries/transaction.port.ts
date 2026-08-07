import type { WebpayTransaction } from '../../entities/webpay-transaction.entity';
import type { TrackingContext } from '../../../../../common/decorators/tracking.decorator';

export interface ICanCreateTransaction {
  create(
    transaction: WebpayTransaction,
    tracking: TrackingContext,
  ): Promise<WebpayTransaction>;
}

export interface ICanGetTransaction {
  getByToken(token: string, tracking: TrackingContext): Promise<WebpayTransaction | null>;
}

export interface ICanUpdateTransaction {
  updateByToken(
    token: string,
    data: Partial<WebpayTransaction>,
    tracking: TrackingContext,
  ): Promise<WebpayTransaction | null>;
}
