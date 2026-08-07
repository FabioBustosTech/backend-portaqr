import { Injectable, Inject, InternalServerErrorException } from '@nestjs/common';
import type { ICanCreateTransaction } from '../../domain/ports/queries/transaction.port';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { TRANSACTION_CREATE_PORT } from '../../domain/constants/webpay.tokens';
import { IWebpayGateway } from '../../../webpay/infrastructure/adapters/transbank-webpay.gateway';
import { WEBPAY_GATEWAY_PORT } from '../../domain/constants/webpay.tokens';
import { CreateTransactionDto } from '../dto/create-transaction.dto';

export interface CreateTransactionResult {
  token: string;
  url: string;
}

@Injectable()
export class CreateTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_CREATE_PORT)
    private readonly creator: ICanCreateTransaction,
    @Inject(WEBPAY_GATEWAY_PORT)
    private readonly gateway: IWebpayGateway,
    private readonly traceService: TraceService,
  ) {}

  async execute(
    dto: CreateTransactionDto,
    tracking: TrackingContext,
  ): Promise<CreateTransactionResult> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'CreateTransactionUseCase', {
      buyOrder: dto.buyOrder,
      amount: dto.amount,
    });

    try {
      const result = await this.gateway.createTransaction(
        dto.buyOrder,
        dto.sessionId,
        dto.amount,
        dto.returnUrl,
        tracking,
      );

      // Persistir la transacciÃ³n inicializada
      await this.creator.create(
        {
          id: '',
          token: result.token,
          amount: dto.amount,
          buyOrder: dto.buyOrder,
          sessionId: dto.sessionId,
          status: 'INITIALIZED',
        },
        tracking,
      );

      this.traceService.log(tracking, TraceLayer.USE_CASE, 'CreateTransactionUseCase - creada', {
        token: result.token,
      });

      return result;
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.USE_CASE, 'CreateTransactionUseCase - error', error as Error);
      throw new InternalServerErrorException('Error creating Webpay transaction');
    }
  }
}
