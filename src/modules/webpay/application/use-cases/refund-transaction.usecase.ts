import { Injectable, Inject, InternalServerErrorException } from '@nestjs/common';
import type { ICanUpdateTransaction } from '../../domain/ports/queries/transaction.port';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { TRANSACTION_UPDATE_PORT, WEBPAY_GATEWAY_PORT } from '../../domain/constants/webpay.tokens';
import { IWebpayGateway } from '../../../webpay/infrastructure/adapters/transbank-webpay.gateway';
import { RefundTransactionDto } from '../dto/refund-transaction.dto';

@Injectable()
export class RefundTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_UPDATE_PORT)
    private readonly updater: ICanUpdateTransaction,
    @Inject(WEBPAY_GATEWAY_PORT)
    private readonly gateway: IWebpayGateway,
    private readonly traceService: TraceService,
  ) {}

  async execute(dto: RefundTransactionDto, tracking: TrackingContext): Promise<any> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'RefundTransactionUseCase', {
      token: dto.token,
      amount: dto.amount,
    });

    try {
      const result = await this.gateway.refund(dto.token, dto.amount, tracking);

      await this.updater.updateByToken(dto.token, { status: 'REFUNDED' }, tracking);

      return result;
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.USE_CASE, 'RefundTransactionUseCase - error', error as Error);
      throw new InternalServerErrorException('Error refunding Webpay transaction');
    }
  }
}
