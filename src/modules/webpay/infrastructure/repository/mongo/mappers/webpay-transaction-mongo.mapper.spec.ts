import { WebpayTransactionMongoMapper } from './webpay-transaction-mongo.mapper';
import type { WebpayTransaction } from '../../../../domain/entities/webpay-transaction.entity';

describe('WebpayTransactionMongoMapper', () => {
  describe('toEntity', () => {
    it('debe mapear un documento con _id a entidad', () => {
      const doc = {
        _id: { toString: () => 'tx-id-1' },
        token: 'tok-1',
        amount: 5000,
        buyOrder: 'BO-1',
        sessionId: 'S-1',
        status: 'AUTHORIZED',
        transactionDate: new Date('2024-08-01T12:00:00.000Z'),
        paymentTypeCode: 'VD',
        authorizationCode: 'auth-1',
        responseCode: 0,
        vci: 'TSY',
        cardNumber: '6622',
        accountingDate: '0801',
        installmentsNumber: 1,
      };

      const entity = WebpayTransactionMongoMapper.toEntity(doc);

      expect(entity).toEqual({
        id: 'tx-id-1',
        token: 'tok-1',
        amount: 5000,
        buyOrder: 'BO-1',
        sessionId: 'S-1',
        status: 'AUTHORIZED',
        transactionDate: doc.transactionDate,
        paymentTypeCode: 'VD',
        authorizationCode: 'auth-1',
        responseCode: 0,
        vci: 'TSY',
        cardNumber: '6622',
        accountingDate: '0801',
        installmentsNumber: 1,
      });
    });

    it('debe usar id vacío cuando el documento no tiene _id', () => {
      const entity = WebpayTransactionMongoMapper.toEntity({
        token: 'tok-2',
        amount: 100,
        buyOrder: 'BO-2',
        sessionId: 'S-2',
        status: 'INITIALIZED',
      });

      expect(entity.id).toBe('');
      expect(entity.token).toBe('tok-2');
    });
  });

  describe('toSchemaData', () => {
    it('debe mapear la entidad a datos de schema', () => {
      const transaction: WebpayTransaction = {
        id: 'tx-1',
        token: 'tok-1',
        amount: 5000,
        buyOrder: 'BO-1',
        sessionId: 'S-1',
        status: 'AUTHORIZED',
        transactionDate: new Date('2024-08-01T12:00:00.000Z'),
        paymentTypeCode: 'VD',
        authorizationCode: 'auth-1',
        responseCode: 0,
        vci: 'TSY',
        cardNumber: '6622',
        accountingDate: '0801',
        installmentsNumber: 1,
      };

      const data = WebpayTransactionMongoMapper.toSchemaData(transaction);

      expect(data).toEqual({
        token: 'tok-1',
        amount: 5000,
        buyOrder: 'BO-1',
        sessionId: 'S-1',
        status: 'AUTHORIZED',
        transactionDate: transaction.transactionDate,
        paymentTypeCode: 'VD',
        authorizationCode: 'auth-1',
        responseCode: 0,
        vci: 'TSY',
        cardNumber: '6622',
        accountingDate: '0801',
        installmentsNumber: 1,
      });
    });

    it('debe mapear datos parciales sin campos opcionales', () => {
      const data = WebpayTransactionMongoMapper.toSchemaData({
        token: 'tok-2',
        status: 'REFUNDED',
      });

      expect(data).toEqual({
        token: 'tok-2',
        status: 'REFUNDED',
      });
    });
  });
});