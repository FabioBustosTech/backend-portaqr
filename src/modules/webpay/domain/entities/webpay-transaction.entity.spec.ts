import { WebpayTransactionEntity } from './webpay-transaction.entity';

describe('WebpayTransactionEntity', () => {
  it('debe estar definido', () => {
    const entity = new WebpayTransactionEntity({});
    expect(entity).toBeDefined();
  });

  describe('constructor', () => {
    it('debe aplicar los valores por defecto cuando no se entregan datos', () => {
      const entity = new WebpayTransactionEntity({});

      expect(entity.id).toBe('');
      expect(entity.token).toBe('');
      expect(entity.amount).toBe(0);
      expect(entity.buyOrder).toBe('');
      expect(entity.sessionId).toBe('');
      expect(entity.status).toBe('INITIALIZED');
      expect(entity.transactionDate).toBeUndefined();
      expect(entity.paymentTypeCode).toBeUndefined();
      expect(entity.authorizationCode).toBeUndefined();
      expect(entity.responseCode).toBeUndefined();
      expect(entity.vci).toBeUndefined();
      expect(entity.cardNumber).toBeUndefined();
      expect(entity.accountingDate).toBeUndefined();
      expect(entity.installmentsNumber).toBeUndefined();
    });

    it('debe mantener los valores entregados', () => {
      const transactionDate = new Date('2024-08-01T12:00:00.000Z');

      const entity = new WebpayTransactionEntity({
        id: 'tx-1',
        token: 'tok-1',
        amount: 5000,
        buyOrder: 'BO-1',
        sessionId: 'S-1',
        status: 'AUTHORIZED',
        transactionDate,
        paymentTypeCode: 'VD',
        authorizationCode: 'auth-1',
        responseCode: 0,
        vci: 'TSY',
        cardNumber: '6622',
        accountingDate: '0801',
        installmentsNumber: 1,
      });

      expect(entity.id).toBe('tx-1');
      expect(entity.token).toBe('tok-1');
      expect(entity.amount).toBe(5000);
      expect(entity.buyOrder).toBe('BO-1');
      expect(entity.sessionId).toBe('S-1');
      expect(entity.status).toBe('AUTHORIZED');
      expect(entity.transactionDate).toBe(transactionDate);
      expect(entity.paymentTypeCode).toBe('VD');
      expect(entity.authorizationCode).toBe('auth-1');
      expect(entity.responseCode).toBe(0);
      expect(entity.vci).toBe('TSY');
      expect(entity.cardNumber).toBe('6622');
      expect(entity.accountingDate).toBe('0801');
      expect(entity.installmentsNumber).toBe(1);
    });

    it('debe aplicar defaults parciales cuando solo algunos campos vienen', () => {
      const entity = new WebpayTransactionEntity({
        token: 'tok-2',
        amount: 1000,
        buyOrder: 'BO-2',
      });

      expect(entity.token).toBe('tok-2');
      expect(entity.amount).toBe(1000);
      expect(entity.buyOrder).toBe('BO-2');
      expect(entity.id).toBe('');
      expect(entity.sessionId).toBe('');
      expect(entity.status).toBe('INITIALIZED');
    });
  });
});