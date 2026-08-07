import { Injectable, Inject, InternalServerErrorException } from '@nestjs/common';
import type { ICanGetTransaction } from '../../domain/ports/queries/transaction.port';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { TRANSACTION_GET_PORT } from '../../domain/constants/webpay.tokens';

@Injectable()
export class GetTransactionStatusUseCase {
  constructor(
    @Inject(TRANSACTION_GET_PORT)
    private readonly reader: ICanGetTransaction,
    private readonly traceService: TraceService,
  ) {}

  async execute(token: string, tracking: TrackingContext): Promise<any> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'GetTransactionStatusUseCase', { token });

    try {
      return await this.reader.getByToken(token, tracking);
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.USE_CASE, 'GetTransactionStatusUseCase - error', error as Error);
      throw new InternalServerErrorException('Error getting Webpay transaction status');
    }
  }

  async getFromDB(token: string, tracking: TrackingContext): Promise<any> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'GetTransactionStatusUseCase - getFromDB', { token });
    return this.reader.getByToken(token, tracking);
  }
}
