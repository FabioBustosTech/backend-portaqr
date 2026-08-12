import { Injectable, Inject, InternalServerErrorException } from '@nestjs/common';
import type { ICanGetTransaction, ICanUpdateTransaction } from '../../domain/ports/queries/transaction.port';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { TRANSACTION_GET_PORT, TRANSACTION_UPDATE_PORT, WEBPAY_GATEWAY_PORT } from '../../domain/constants/webpay.tokens';
import { IWebpayGateway, CommitTransactionResult } from '../../../webpay/infrastructure/adapters/transbank-webpay.gateway';

export interface CommitTransactionMapped {
  id: string;
  amount: number;
  status: string;
  buyOrder: string;
  sessionId: string;
  transactionDate?: Date;
  paymentTypeCode?: string;
  authorizationCode?: string;
  responseCode?: number;
  vci?: string;
  cardNumber?: string;
  accountingDate?: string;
  installmentsNumber?: number;
}

@Injectable()
export class CommitTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_GET_PORT)
    private readonly reader: ICanGetTransaction,
    @Inject(TRANSACTION_UPDATE_PORT)
    private readonly updater: ICanUpdateTransaction,
    @Inject(WEBPAY_GATEWAY_PORT)
    private readonly gateway: IWebpayGateway,
    private readonly traceService: TraceService,
  ) {}

  async execute(token: string, tracking: TrackingContext): Promise<CommitTransactionMapped> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'CommitTransactionUseCase', {
      tokenPreview: token ? token.slice(0, 8) + '…' : '',
    });

    try {
      const result = await this.gateway.commitTransaction(token, tracking);

      // SPEC-009 A2/B12: la transacción debe existir en BD y el amount devuelto por
      // Transbank debe coincidir con el persistido — si no, NO se actualiza (evita
      // discrepancias y commits sobre transacciones no creadas por la plataforma).
      const existing = await this.reader.getByToken(token, tracking);
      if (!existing) {
        this.traceService.warn(
          tracking,
          TraceLayer.USE_CASE,
          'CommitTransactionUseCase - transaccion no encontrada',
          { tokenPreview: token ? token.slice(0, 8) + '…' : '' },
        );
        throw new Error('Transaction not found');
      }
      if (existing.amount !== result.amount) {
        this.traceService.warn(
          tracking,
          TraceLayer.USE_CASE,
          'CommitTransactionUseCase - amount mismatch',
          { persisted: existing.amount, transbank: result.amount },
        );
        throw new Error('Amount mismatch: persisted amount differs from Transbank');
      }

      const mappedTransaction = this.mapToTransaction(result);

      const updated = await this.updater.updateByToken(token, mappedTransaction, tracking);

      if (!updated) {
        this.traceService.warn(tracking, TraceLayer.USE_CASE, 'CommitTransactionUseCase - transaccion no encontrada', {
          tokenPreview: token ? token.slice(0, 8) + '…' : '',
        });
        throw new Error('Transaction not found');
      }

      return {
        ...mappedTransaction,
        id: updated.id,
      };
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.USE_CASE, 'CommitTransactionUseCase - error', error as Error);
      throw new InternalServerErrorException('Error committing Webpay transaction');
    }
  }

  private mapToTransaction(response: CommitTransactionResult) {
    return {
      amount: response.amount,
      status: response.status,
      buyOrder: response.buy_order,
      sessionId: response.session_id,
      transactionDate: response.transaction_date ? new Date(response.transaction_date) : undefined,
      paymentTypeCode: response.payment_type_code,
      authorizationCode: response.authorization_code,
      responseCode: response.response_code,
      vci: response.vci,
      cardNumber: response.card_detail?.card_number,
      accountingDate: response.accounting_date,
      installmentsNumber: response.installments_number,
    };
  }
}
