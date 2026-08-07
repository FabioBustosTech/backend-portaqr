import { WebpayTransactionAggregate } from './webpay-transaction.aggregate';
import type { WebpayTransactionSnapshot } from './webpay-transaction.aggregate';

describe('WebpayTransactionAggregate', () => {
  const snapshot: WebpayTransactionSnapshot = {
    id: 'tx-existing-1',
    token: 'tok-existing',
    amount: 9990,
    buyOrder: 'BO-EXIST',
    sessionId: 'S-EXIST',
    status: 'AUTHORIZED',
    transactionDate: new Date('2024-08-01T12:00:00.000Z'),
    paymentTypeCode: 'VD',
    authorizationCode: 'auth-xyz',
    responseCode: 0,
    vci: 'TSY',
    cardNumber: '6622',
    accountingDate: '0801',
    installmentsNumber: 3,
  };

  describe('crear', () => {
    it('debe crear una transacción con id único, status INITIALIZED por defecto y los datos entregados', () => {
      const aggregate = WebpayTransactionAggregate.crear({
        token: 'tok-new',
        amount: 5000,
        buyOrder: 'BO-1',
        sessionId: 'S-1',
      });

      expect(aggregate.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(aggregate.token).toBe('tok-new');
      expect(aggregate.amount).toBe(5000);
      expect(aggregate.buyOrder).toBe('BO-1');
      expect(aggregate.sessionId).toBe('S-1');
      expect(aggregate.status).toBe('INITIALIZED');
    });

    it('debe generar ids distintos en cada creación', () => {
      const a = WebpayTransactionAggregate.crear({
        token: 't1',
        amount: 100,
        buyOrder: 'B1',
        sessionId: 'S1',
      });
      const b = WebpayTransactionAggregate.crear({
        token: 't2',
        amount: 200,
        buyOrder: 'B2',
        sessionId: 'S2',
      });

      expect(a.id).not.toBe(b.id);
    });

    it('debe usar el status entregado cuando viene explícito', () => {
      const aggregate = WebpayTransactionAggregate.crear({
        token: 'tok-new',
        amount: 5000,
        buyOrder: 'BO-1',
        sessionId: 'S-1',
        status: 'CUSTOM',
      });

      expect(aggregate.status).toBe('CUSTOM');
    });
  });

  describe('cargarExistente', () => {
    it('debe reconstruir el aggregate con todos los campos del snapshot', () => {
      const aggregate = WebpayTransactionAggregate.cargarExistente(snapshot);

      expect(aggregate.id).toBe('tx-existing-1');
      expect(aggregate.token).toBe('tok-existing');
      expect(aggregate.amount).toBe(9990);
      expect(aggregate.buyOrder).toBe('BO-EXIST');
      expect(aggregate.sessionId).toBe('S-EXIST');
      expect(aggregate.status).toBe('AUTHORIZED');
      expect(aggregate.transactionDate).toEqual(snapshot.transactionDate);
      expect(aggregate.paymentTypeCode).toBe('VD');
      expect(aggregate.authorizationCode).toBe('auth-xyz');
      expect(aggregate.responseCode).toBe(0);
      expect(aggregate.vci).toBe('TSY');
      expect(aggregate.cardNumber).toBe('6622');
      expect(aggregate.accountingDate).toBe('0801');
      expect(aggregate.installmentsNumber).toBe(3);
    });

    it('debe dejar los getters opcionales como undefined cuando el snapshot no los trae', () => {
      const aggregate = WebpayTransactionAggregate.cargarExistente({
        id: 'tx-min',
        token: 'tok-min',
        amount: 100,
        buyOrder: 'BO-MIN',
        sessionId: 'S-MIN',
        status: 'INITIALIZED',
      });

      expect(aggregate.transactionDate).toBeUndefined();
      expect(aggregate.paymentTypeCode).toBeUndefined();
      expect(aggregate.authorizationCode).toBeUndefined();
      expect(aggregate.responseCode).toBeUndefined();
      expect(aggregate.vci).toBeUndefined();
      expect(aggregate.cardNumber).toBeUndefined();
      expect(aggregate.accountingDate).toBeUndefined();
      expect(aggregate.installmentsNumber).toBeUndefined();
    });
  });

  describe('toSnapshot', () => {
    it('debe serializar todos los campos del aggregate', () => {
      const aggregate = WebpayTransactionAggregate.cargarExistente(snapshot);

      expect(aggregate.toSnapshot()).toEqual(snapshot);
    });

    it('debe serializar los opcionales cuando existen', () => {
      const aggregate = WebpayTransactionAggregate.crear({
        token: 'tok-snap',
        amount: 100,
        buyOrder: 'BO-S',
        sessionId: 'S-S',
      });

      const snap = aggregate.toSnapshot();

      expect(snap.token).toBe('tok-snap');
      expect(snap.status).toBe('INITIALIZED');
      expect(snap.transactionDate).toBeUndefined();
    });
  });

  describe('toEntity', () => {
    it('debe devolver el snapshot como entidad', () => {
      const aggregate = WebpayTransactionAggregate.cargarExistente(snapshot);

      expect(aggregate.toEntity()).toEqual(snapshot);
    });
  });

  describe('getters', () => {
    it('debe exponer los getters de los campos básicos', () => {
      const aggregate = WebpayTransactionAggregate.cargarExistente(snapshot);

      expect(aggregate.id).toBe('tx-existing-1');
      expect(aggregate.token).toBe('tok-existing');
      expect(aggregate.amount).toBe(9990);
      expect(aggregate.buyOrder).toBe('BO-EXIST');
      expect(aggregate.sessionId).toBe('S-EXIST');
      expect(aggregate.status).toBe('AUTHORIZED');
    });
  });
});