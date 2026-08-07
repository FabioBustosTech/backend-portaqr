import { QrActivateMongoMapper } from './qr-activate-mongo.mapper';
import {
  MethodActivation,
  ActivationState,
  WebpayState,
  DocumentType,
  type QrActivate,
} from '../../../../domain/entities/qr-activate.entity';

describe('QrActivateMongoMapper', () => {
  const docCompleto = {
    _id: { toString: () => 'act-1' },
    methodActivation: MethodActivation.WEBPAY,
    activationDate: new Date('2024-08-01T12:00:00.000Z'),
    state: ActivationState.PAYED,
    TransferDate: {
      tranferAmount: 5000,
      originAccount: 'OA-1',
      destinationAccount: 'DA-1',
      originBank: 'OB-1',
      destinationBank: 'DB-1',
      transationDate: new Date('2024-08-01T13:00:00.000Z'),
    },
    descriptionAdministrator: 'Admin',
    adminId: 'admin-1',
    WebpayTransaction: {
      id: 'tok-1',
      date: new Date('2024-08-01T14:00:00.000Z'),
      state: WebpayState.ACTIVE,
    },
    price: { TotalPrice: 5000, TotalDiscount: 0, TotalTax: 500 },
    userId: { toString: () => 'user-1' },
    description: 'Activación de prueba',
    qrList: [
      {
        qrCode: { toString: () => 'qr-1' },
        price: 5000,
        expirationDate: new Date('2025-08-01T12:00:00.000Z'),
        duration: '1M',
        plan: { toString: () => 'plan-1' },
      },
    ],
    documentType: DocumentType.BOLETA,
    invoiceData: { rut: '11-1', direccion: 'Av 1', giro: 'Giro', razonSocial: 'RS' },
    sendDocument: true,
    createdAt: new Date('2024-08-01T10:00:00.000Z'),
    updatedAt: new Date('2024-08-01T11:00:00.000Z'),
  };

  const activationCompleta: QrActivate = {
    id: 'act-1',
    methodActivation: MethodActivation.WEBPAY,
    activationDate: docCompleto.activationDate,
    state: ActivationState.PAYED,
    TransferDate: docCompleto.TransferDate,
    descriptionAdministrator: 'Admin',
    adminId: 'admin-1',
    WebpayTransaction: docCompleto.WebpayTransaction,
    price: { TotalPrice: 5000, TotalDiscount: 0, TotalTax: 500 },
    userId: 'user-1',
    description: 'Activación de prueba',
    qrList: [
      {
        qrCode: 'qr-1',
        price: 5000,
        expirationDate: docCompleto.qrList[0].expirationDate,
        duration: '1M',
        plan: 'plan-1',
      },
    ],
    documentType: DocumentType.BOLETA,
    invoiceData: docCompleto.invoiceData,
    sendDocument: true,
    createdAt: docCompleto.createdAt,
    updatedAt: docCompleto.updatedAt,
  };

  describe('toEntity', () => {
    it('debe mapear un documento con _id y ObjectIds a entidad', () => {
      const entity = QrActivateMongoMapper.toEntity(docCompleto);

      expect(entity).toEqual(activationCompleta);
    });

    it('debe usar id vacío cuando el documento no tiene _id', () => {
      const entity = QrActivateMongoMapper.toEntity({ ...docCompleto, _id: undefined });

      expect(entity.id).toBe('');
      expect(entity.methodActivation).toBe(MethodActivation.WEBPAY);
    });

    it('debe convertir userId a string cuando no tiene método toString', () => {
      const entity = QrActivateMongoMapper.toEntity({
        ...docCompleto,
        userId: null,
      } as any);

      expect(entity.userId).toBe('null');
    });

    it('debe usar qrList vacío cuando el documento no trae qrList', () => {
      const entity = QrActivateMongoMapper.toEntity({ ...docCompleto, qrList: undefined });

      expect(entity.qrList).toEqual([]);
    });

    it('debe convertir qrCode a String cuando no tiene método toString', () => {
      const entity = QrActivateMongoMapper.toEntity({
        ...docCompleto,
        qrList: [{ qrCode: null, price: 100, expirationDate: new Date(), duration: '1M' }],
      } as any);

      expect(entity.qrList[0].qrCode).toBe('null');
    });

    it('debe dejar plan undefined cuando el qr no tiene plan', () => {
      const entity = QrActivateMongoMapper.toEntity({
        ...docCompleto,
        qrList: [{ qrCode: 'qr-2', price: 100, expirationDate: new Date(), duration: '1M' }],
      } as any);

      expect(entity.qrList[0].plan).toBeUndefined();
    });

    it('debe convertir plan a String cuando toString no devuelve un valor útil', () => {
      const entity = QrActivateMongoMapper.toEntity({
        ...docCompleto,
        qrList: [
          {
            qrCode: 'qr-3',
            price: 100,
            expirationDate: new Date(),
            duration: '1M',
            plan: { toString: () => '' },
          },
        ],
      } as any);

      expect(entity.qrList[0].plan).toBe('');
    });
  });

  describe('toSchemaData', () => {
    it('debe mapear la entidad a datos de schema', () => {
      const data = QrActivateMongoMapper.toSchemaData(activationCompleta);

      expect(data).toEqual({
        methodActivation: 'WEBPAY',
        activationDate: docCompleto.activationDate,
        state: 'PAYED',
        TransferDate: docCompleto.TransferDate,
        descriptionAdministrator: 'Admin',
        adminId: 'admin-1',
        WebpayTransaction: docCompleto.WebpayTransaction,
        price: { TotalPrice: 5000, TotalDiscount: 0, TotalTax: 500 },
        userId: 'user-1',
        description: 'Activación de prueba',
        qrList: [
          {
            qrCode: 'qr-1',
            price: 5000,
            expirationDate: docCompleto.qrList[0].expirationDate,
            duration: '1M',
            plan: 'plan-1',
          },
        ],
        documentType: 'BOLETA',
        invoiceData: docCompleto.invoiceData,
        sendDocument: true,
      });
    });

    it('debe mapear datos parciales sin qrList', () => {
      const data = QrActivateMongoMapper.toSchemaData({
        methodActivation: MethodActivation.ADMIN,
        state: ActivationState.PENDING,
        price: { TotalPrice: 100, TotalTax: 10 },
        userId: 'user-2',
        documentType: DocumentType.FACTURA,
      });

      expect(data).toEqual({
        methodActivation: MethodActivation.ADMIN,
        activationDate: undefined,
        state: ActivationState.PENDING,
        TransferDate: undefined,
        descriptionAdministrator: undefined,
        adminId: undefined,
        WebpayTransaction: undefined,
        price: { TotalPrice: 100, TotalTax: 10 },
        userId: 'user-2',
        description: undefined,
        qrList: undefined,
        documentType: DocumentType.FACTURA,
        invoiceData: undefined,
        sendDocument: undefined,
      });
    });
  });
});