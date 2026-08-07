import type { WebpayTransaction } from '../../../../domain/entities/webpay-transaction.entity';
import type { TransactionSchema } from '../schemas/transaction.schema';

export class WebpayTransactionMongoMapper {
  static toEntity(doc: TransactionSchema & { _id?: unknown }): WebpayTransaction {
    return {
      id: doc._id?.toString() || '',
      token: doc.token,
      amount: doc.amount,
      buyOrder: doc.buyOrder,
      sessionId: doc.sessionId,
      status: doc.status,
      transactionDate: doc.transactionDate,
      paymentTypeCode: doc.paymentTypeCode,
      authorizationCode: doc.authorizationCode,
      responseCode: doc.responseCode,
      vci: doc.vci,
      cardNumber: doc.cardNumber,
      accountingDate: doc.accountingDate,
      installmentsNumber: doc.installmentsNumber,
    };
  }

  static toSchemaData(tx: Partial<WebpayTransaction>): Partial<TransactionSchema> {
    return {
      token: tx.token,
      amount: tx.amount,
      buyOrder: tx.buyOrder,
      sessionId: tx.sessionId,
      status: tx.status,
      transactionDate: tx.transactionDate,
      paymentTypeCode: tx.paymentTypeCode,
      authorizationCode: tx.authorizationCode,
      responseCode: tx.responseCode,
      vci: tx.vci,
      cardNumber: tx.cardNumber,
      accountingDate: tx.accountingDate,
      installmentsNumber: tx.installmentsNumber,
    };
  }
}
