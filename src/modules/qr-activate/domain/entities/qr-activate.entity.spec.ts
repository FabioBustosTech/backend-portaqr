import { QrActivateEntity } from './qr-activate.entity';
import {
  MethodActivation,
  ActivationState,
  DocumentType,
} from './qr-activate.entity';

describe('QrActivateEntity', () => {
  it('debe construir una entidad con los valores entregados', () => {
    const entity = new QrActivateEntity({
      id: 'act-1',
      methodActivation: MethodActivation.TRANSFER,
      activationDate: new Date('2024-01-01T10:00:00Z'),
      state: ActivationState.ACTIVE,
      price: { TotalPrice: 200, TotalTax: 38 },
      userId: 'user-1',
      qrList: [],
      documentType: DocumentType.FACTURA,
      sendDocument: true,
      createdAt: new Date('2024-01-01T10:00:00Z'),
    });

    expect(entity.id).toBe('act-1');
    expect(entity.methodActivation).toBe(MethodActivation.TRANSFER);
    expect(entity.activationDate).toEqual(new Date('2024-01-01T10:00:00Z'));
    expect(entity.state).toBe(ActivationState.ACTIVE);
    expect(entity.price).toEqual({ TotalPrice: 200, TotalTax: 38 });
    expect(entity.userId).toBe('user-1');
    expect(entity.qrList).toEqual([]);
    expect(entity.documentType).toBe(DocumentType.FACTURA);
    expect(entity.sendDocument).toBe(true);
  });

  it('debe aplicar valores por defecto cuando los datos están vacíos', () => {
    const entity = new QrActivateEntity({});

    expect(entity.id).toBe('');
    expect(entity.methodActivation).toBe(MethodActivation.WEBPAY);
    expect(entity.state).toBe(ActivationState.PENDING);
    expect(entity.price).toEqual({ TotalPrice: 0, TotalTax: 0 });
    expect(entity.userId).toBe('');
    expect(entity.qrList).toEqual([]);
    expect(entity.documentType).toBe(DocumentType.BOLETA);
    expect(entity.sendDocument).toBe(false);
    expect(entity.activationDate).toBeUndefined();
    expect(entity.TransferDate).toBeUndefined();
    expect(entity.descriptionAdministrator).toBeUndefined();
    expect(entity.adminId).toBeUndefined();
    expect(entity.WebpayTransaction).toBeUndefined();
    expect(entity.description).toBeUndefined();
    expect(entity.invoiceData).toBeUndefined();
    expect(entity.createdAt).toBeUndefined();
    expect(entity.updatedAt).toBeUndefined();
  });

  it('debe preservar undefined en campos opcionales cuando no se envían', () => {
    const entity = new QrActivateEntity({
      id: 'act-2',
      methodActivation: MethodActivation.ADMIN,
      state: ActivationState.ADMIN,
      price: { TotalPrice: 0, TotalTax: 0 },
      userId: 'user-2',
      qrList: [],
      documentType: DocumentType.NO_APLICA,
    });

    expect(entity.methodActivation).toBe(MethodActivation.ADMIN);
    expect(entity.state).toBe(ActivationState.ADMIN);
    expect(entity.documentType).toBe(DocumentType.NO_APLICA);
    expect(entity.sendDocument).toBe(false);
    expect(entity.TransferDate).toBeUndefined();
  });
});