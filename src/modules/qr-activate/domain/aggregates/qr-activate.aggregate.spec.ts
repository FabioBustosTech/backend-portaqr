import { QrActivateAggregate } from './qr-activate.aggregate';
import type { CreateQrActivateProps, QrActivateSnapshot } from './qr-activate.aggregate';
import {
  MethodActivation,
  ActivationState,
  DocumentType,
  WebpayState,
} from '../entities/qr-activate.entity';

describe('QrActivateAggregate', () => {
  const props: CreateQrActivateProps = {
    methodActivation: MethodActivation.WEBPAY,
    state: ActivationState.PENDING,
    activationDate: new Date('2024-01-01T10:00:00Z'),
    price: { TotalPrice: 100, TotalTax: 19 },
    userId: 'user-1',
    description: 'Activación de prueba',
    qrList: [
      {
        qrCode: 'qr-1',
        price: 100,
        expirationDate: new Date('2024-12-31'),
        duration: '12 meses',
      },
    ],
    documentType: DocumentType.BOLETA,
    WebpayTransaction: { id: 'tx-1', state: WebpayState.PENDING },
    sendDocument: true,
  };

  const snapshot: QrActivateSnapshot = {
    id: 'act-1',
    methodActivation: MethodActivation.TRANSFER,
    state: ActivationState.ACTIVE,
    price: { TotalPrice: 200, TotalTax: 38 },
    userId: 'user-2',
    qrList: [],
    documentType: DocumentType.FACTURA,
    WebpayTransaction: { id: 'tx-2', state: WebpayState.ACTIVE },
  };

  describe('crear', () => {
    it('debe crear un aggregate con id generado, estado PENDING por defecto y createdAt', () => {
      const aggregate = QrActivateAggregate.crear(props);

      expect(aggregate.id).toBeDefined();
      expect(aggregate.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(aggregate.methodActivation).toBe(MethodActivation.WEBPAY);
      expect(aggregate.state).toBe(ActivationState.PENDING);
      expect(aggregate.price).toEqual(props.price);
      expect(aggregate.userId).toBe('user-1');
      expect(aggregate.qrList).toEqual(props.qrList);
      expect(aggregate.documentType).toBe(DocumentType.BOLETA);
      expect(aggregate.WebpayTransaction).toEqual(props.WebpayTransaction);
      const snap = aggregate.toSnapshot();
      expect(snap.createdAt).toBeInstanceOf(Date);
    });

    it('debe usar PENDING como estado por defecto si no se especifica', () => {
      const { state, ...propsSinEstado } = props;
      void state; // referencia explícita: se descarta intencionalmente (spec)
      const aggregate = QrActivateAggregate.crear(propsSinEstado);

      expect(aggregate.state).toBe(ActivationState.PENDING);
    });
  });

  describe('cargarExistente', () => {
    it('debe reconstruir el aggregate desde un snapshot', () => {
      const aggregate = QrActivateAggregate.cargarExistente(snapshot);

      expect(aggregate.id).toBe('act-1');
      expect(aggregate.methodActivation).toBe(MethodActivation.TRANSFER);
      expect(aggregate.state).toBe(ActivationState.ACTIVE);
      expect(aggregate.price).toEqual({ TotalPrice: 200, TotalTax: 38 });
      expect(aggregate.userId).toBe('user-2');
      expect(aggregate.documentType).toBe(DocumentType.FACTURA);
    });
  });

  describe('marcarPagada', () => {
    it('debe retornar un nuevo aggregate con estado PAYED sin mutar el original', () => {
      const aggregate = QrActivateAggregate.cargarExistente(snapshot);

      const pagada = aggregate.marcarPagada();

      expect(pagada.state).toBe(ActivationState.PAYED);
      expect(aggregate.state).toBe(ActivationState.ACTIVE);
      expect(pagada.id).toBe(aggregate.id);
      expect(pagada.userId).toBe(aggregate.userId);
    });
  });

  describe('marcarFallida', () => {
    it('debe retornar un nuevo aggregate con estado FAILED', () => {
      const aggregate = QrActivateAggregate.cargarExistente(snapshot);

      const fallida = aggregate.marcarFallida();

      expect(fallida.state).toBe(ActivationState.FAILED);
      expect(aggregate.state).toBe(ActivationState.ACTIVE);
    });
  });

  describe('actualizarWebpayState', () => {
    it('debe actualizar el estado de la transacción Webpay conservando el resto', () => {
      const aggregate = QrActivateAggregate.cargarExistente(snapshot);

      const actualizada = aggregate.actualizarWebpayState(WebpayState.CANCELLED);

      expect(actualizada.WebpayTransaction).toEqual({
        id: 'tx-2',
        state: WebpayState.CANCELLED,
      });
      expect(aggregate.WebpayTransaction.state).toBe(WebpayState.ACTIVE);
    });

    it('debe crear la transacción Webpay si no existía previamente', () => {
      const sinWebpay: QrActivateSnapshot = {
        ...snapshot,
        WebpayTransaction: undefined,
      };
      const aggregate = QrActivateAggregate.cargarExistente(sinWebpay);

      const actualizada = aggregate.actualizarWebpayState(WebpayState.ERROR);

      expect(actualizada.WebpayTransaction).toEqual({ state: WebpayState.ERROR });
    });
  });

  describe('toSnapshot / toEntity', () => {
    it('debe serializar el aggregate completo', () => {
      const aggregate = QrActivateAggregate.cargarExistente(snapshot);

      const snap = aggregate.toSnapshot();

      expect(snap).toEqual(snapshot);
      expect(aggregate.toEntity()).toEqual(snapshot);
    });
  });

  describe('getters', () => {
    it('debe exponer los getters de las propiedades principales', () => {
      const aggregate = QrActivateAggregate.cargarExistente(snapshot);

      expect(aggregate.id).toBe('act-1');
      expect(aggregate.methodActivation).toBe(MethodActivation.TRANSFER);
      expect(aggregate.state).toBe(ActivationState.ACTIVE);
      expect(aggregate.WebpayTransaction).toEqual({
        id: 'tx-2',
        state: WebpayState.ACTIVE,
      });
      expect(aggregate.price).toEqual({ TotalPrice: 200, TotalTax: 38 });
      expect(aggregate.userId).toBe('user-2');
      expect(aggregate.qrList).toEqual([]);
      expect(aggregate.documentType).toBe(DocumentType.FACTURA);
    });
  });
});