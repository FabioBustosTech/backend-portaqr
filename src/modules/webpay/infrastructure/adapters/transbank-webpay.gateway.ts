import { Injectable } from '@nestjs/common';
import { WebpayPlus, Options, Environment } from 'transbank-sdk';
import { ConfigService } from '@nestjs/config';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';

export interface CreateTransactionResult {
  token: string;
  url: string;
}

export interface CommitTransactionResult {
  amount: number;
  status: string;
  buy_order: string;
  session_id: string;
  transaction_date?: Date;
  payment_type_code?: string;
  authorization_code?: string;
  response_code?: number;
  vci?: string;
  card_detail?: { card_number?: string };
  accounting_date?: string;
  installments_number?: number;
}

/** Puerto del gateway de Transbank */
export interface IWebpayGateway {
  createTransaction(
    buyOrder: string,
    sessionId: string,
    amount: number,
    returnUrl: string,
    tracking: TrackingContext,
  ): Promise<CreateTransactionResult>;
  commitTransaction(token: string, tracking: TrackingContext): Promise<CommitTransactionResult>;
  refund(token: string, amount: number, tracking: TrackingContext): Promise<any>;
}

/** Adaptador del gateway Transbank (infraestructura) */
@Injectable()
export class TransbankWebpayGateway implements IWebpayGateway {
  private webpay: InstanceType<typeof WebpayPlus.Transaction>;

  constructor(
    private configService: ConfigService,
    private traceService: TraceService,
  ) {
    const commerceCode = this.configService.get<string>('WEBPAY_COMMERCE_CODE');
    const apiKey = this.configService.get<string>('WEBPAY_API_KEY');
    const environment =
      this.configService.get<string>('WEBPAY_ENVIRONMENT') === 'LIVE'
        ? Environment.Production
        : Environment.Integration;

    const options: Options = new Options(commerceCode, apiKey, environment);
    this.webpay = new WebpayPlus.Transaction(options);
  }

  async createTransaction(
    buyOrder: string,
    sessionId: string,
    amount: number,
    returnUrl: string,
    tracking: TrackingContext,
  ): Promise<CreateTransactionResult> {
    this.traceService.log(tracking, TraceLayer.SERVICE, 'TransbankWebpayGateway.createTransaction', {
      buyOrder,
      amount,
      returnUrl,
    });

    const result = await this.webpay.create(buyOrder, sessionId, amount, returnUrl);
    return { token: result.token, url: result.url };
  }

  async commitTransaction(
    token: string,
    tracking: TrackingContext,
  ): Promise<CommitTransactionResult> {
    this.traceService.log(tracking, TraceLayer.SERVICE, 'TransbankWebpayGateway.commitTransaction', {
      token,
    });

    const result = await this.webpay.commit(token);
    return result as unknown as CommitTransactionResult;
  }

  async refund(token: string, amount: number, tracking: TrackingContext): Promise<any> {
    this.traceService.log(tracking, TraceLayer.SERVICE, 'TransbankWebpayGateway.refund', {
      token,
      amount,
    });

    const result = await this.webpay.refund(token, amount);
    return result;
  }
}
