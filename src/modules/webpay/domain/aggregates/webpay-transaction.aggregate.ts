import { WebpayTransaction } from '../entities/webpay-transaction.entity';
import { randomUUID } from 'crypto';

export interface WebpayTransactionSnapshot extends WebpayTransaction {}

export interface CreateWebpayTransactionProps {
  token: string;
  amount: number;
  buyOrder: string;
  sessionId: string;
  status?: string;
}

export class WebpayTransactionAggregate {
  private readonly _id: string;
  private readonly _token: string;
  private readonly _amount: number;
  private readonly _buyOrder: string;
  private readonly _sessionId: string;
  private readonly _status: string;
  private readonly _transactionDate?: Date;
  private readonly _paymentTypeCode?: string;
  private readonly _authorizationCode?: string;
  private readonly _responseCode?: number;
  private readonly _vci?: string;
  private readonly _cardNumber?: string;
  private readonly _accountingDate?: string;
  private readonly _installmentsNumber?: number;

  private constructor(props: WebpayTransactionSnapshot) {
    this._id = props.id;
    this._token = props.token;
    this._amount = props.amount;
    this._buyOrder = props.buyOrder;
    this._sessionId = props.sessionId;
    this._status = props.status;
    this._transactionDate = props.transactionDate;
    this._paymentTypeCode = props.paymentTypeCode;
    this._authorizationCode = props.authorizationCode;
    this._responseCode = props.responseCode;
    this._vci = props.vci;
    this._cardNumber = props.cardNumber;
    this._accountingDate = props.accountingDate;
    this._installmentsNumber = props.installmentsNumber;
  }

  // ---- Factory methods ----

  static crear(props: CreateWebpayTransactionProps): WebpayTransactionAggregate {
    return new WebpayTransactionAggregate({
      id: randomUUID(),
      token: props.token,
      amount: props.amount,
      buyOrder: props.buyOrder,
      sessionId: props.sessionId,
      status: props.status ?? 'INITIALIZED',
    });
  }

  static cargarExistente(snap: WebpayTransactionSnapshot): WebpayTransactionAggregate {
    return new WebpayTransactionAggregate(snap);
  }

  // ---- Serialización ----

  toSnapshot(): WebpayTransactionSnapshot {
    return {
      id: this._id,
      token: this._token,
      amount: this._amount,
      buyOrder: this._buyOrder,
      sessionId: this._sessionId,
      status: this._status,
      transactionDate: this._transactionDate,
      paymentTypeCode: this._paymentTypeCode,
      authorizationCode: this._authorizationCode,
      responseCode: this._responseCode,
      vci: this._vci,
      cardNumber: this._cardNumber,
      accountingDate: this._accountingDate,
      installmentsNumber: this._installmentsNumber,
    };
  }

  toEntity(): WebpayTransaction {
    return this.toSnapshot();
  }

  // ---- Getters ----

  get id(): string {
    return this._id;
  }
  get token(): string {
    return this._token;
  }
  get amount(): number {
    return this._amount;
  }
  get buyOrder(): string {
    return this._buyOrder;
  }
  get sessionId(): string {
    return this._sessionId;
  }
  get status(): string {
    return this._status;
  }
  get transactionDate(): Date | undefined {
    return this._transactionDate;
  }
  get paymentTypeCode(): string | undefined {
    return this._paymentTypeCode;
  }
  get authorizationCode(): string | undefined {
    return this._authorizationCode;
  }
  get responseCode(): number | undefined {
    return this._responseCode;
  }
  get vci(): string | undefined {
    return this._vci;
  }
  get cardNumber(): string | undefined {
    return this._cardNumber;
  }
  get accountingDate(): string | undefined {
    return this._accountingDate;
  }
  get installmentsNumber(): number | undefined {
    return this._installmentsNumber;
  }
}
