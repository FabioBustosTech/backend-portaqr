/** Entidad de dominio pura de una transacción Webpay */
export interface WebpayTransaction {
  id: string;
  token: string;
  amount: number;
  buyOrder: string;
  sessionId: string;
  status: string;
  transactionDate?: Date;
  paymentTypeCode?: string;
  authorizationCode?: string;
  responseCode?: number;
  vci?: string;
  cardNumber?: string;
  accountingDate?: string;
  installmentsNumber?: number;
}

export class WebpayTransactionEntity implements WebpayTransaction {
  id: string;
  token: string;
  amount: number;
  buyOrder: string;
  sessionId: string;
  status: string;
  transactionDate?: Date;
  paymentTypeCode?: string;
  authorizationCode?: string;
  responseCode?: number;
  vci?: string;
  cardNumber?: string;
  accountingDate?: string;
  installmentsNumber?: number;

  constructor(data: Partial<WebpayTransaction>) {
    this.id = data.id || '';
    this.token = data.token || '';
    this.amount = data.amount || 0;
    this.buyOrder = data.buyOrder || '';
    this.sessionId = data.sessionId || '';
    this.status = data.status || 'INITIALIZED';
    this.transactionDate = data.transactionDate;
    this.paymentTypeCode = data.paymentTypeCode;
    this.authorizationCode = data.authorizationCode;
    this.responseCode = data.responseCode;
    this.vci = data.vci;
    this.cardNumber = data.cardNumber;
    this.accountingDate = data.accountingDate;
    this.installmentsNumber = data.installmentsNumber;
  }
}
