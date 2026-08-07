import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoQrActivateRepository } from './mongo-qr-activate.repository';
import { QrActivateSchema, QrActivateDocument } from './schemas/qr-activate.schema';
import { TraceService, TraceLayer } from '../../../../../common/services/trace.service';
import type { TrackingContext } from '../../../../../common/decorators/tracking.decorator';
import {
  MethodActivation,
  ActivationState,
  WebpayState,
  DocumentType,
  type QrActivate,
} from '../../../domain/entities/qr-activate.entity';

const mockFind = jest.fn();
const mockFindOne = jest.fn();
const mockFindById = jest.fn();
const mockCountDocuments = jest.fn();
const mockFindByIdAndUpdate = jest.fn();
const mockFindByIdAndDelete = jest.fn();
const mockSave = jest.fn();

const modelMock = jest.fn().mockImplementation((data: Record<string, unknown>) => ({
  ...data,
  save: mockSave,
})) as unknown as Model<QrActivateDocument>;

(modelMock as unknown as Record<string, unknown>).find = mockFind;
(modelMock as unknown as Record<string, unknown>).findOne = mockFindOne;
(modelMock as unknown as Record<string, unknown>).findById = mockFindById;
(modelMock as unknown as Record<string, unknown>).countDocuments = mockCountDocuments;
(modelMock as unknown as Record<string, unknown>).findByIdAndUpdate = mockFindByIdAndUpdate;
(modelMock as unknown as Record<string, unknown>).findByIdAndDelete = mockFindByIdAndDelete;

/** Crea una query chainable de mongoose mockeada que resuelve execResult */
function mockQuery(execResult: unknown) {
  return {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(execResult),
  };
}

describe('MongoQrActivateRepository', () => {
  let repository: MongoQrActivateRepository;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const doc = {
    _id: { toString: () => 'act-1' },
    methodActivation: MethodActivation.WEBPAY,
    activationDate: new Date('2024-08-01T12:00:00.000Z'),
    state: ActivationState.PAYED,
    descriptionAdministrator: 'Admin',
    adminId: 'admin-1',
    WebpayTransaction: { id: 'tok-1', state: WebpayState.ACTIVE },
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

  const activation: QrActivate = {
    id: 'act-1',
    methodActivation: MethodActivation.WEBPAY,
    activationDate: doc.activationDate,
    state: ActivationState.PAYED,
    descriptionAdministrator: 'Admin',
    adminId: 'admin-1',
    WebpayTransaction: { id: 'tok-1', state: WebpayState.ACTIVE },
    price: { TotalPrice: 5000, TotalDiscount: 0, TotalTax: 500 },
    userId: 'user-1',
    description: 'Activación de prueba',
    qrList: [
      {
        qrCode: 'qr-1',
        price: 5000,
        expirationDate: doc.qrList[0].expirationDate,
        duration: '1M',
        plan: 'plan-1',
      },
    ],
    documentType: DocumentType.BOLETA,
    invoiceData: doc.invoiceData,
    sendDocument: true,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongoQrActivateRepository,
        {
          provide: getModelToken(QrActivateSchema.name),
          useValue: modelMock,
        },
        {
          provide: TraceService,
          useValue: {
            log: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get(MongoQrActivateRepository);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('debe crear el documento con el mapper y retornar la entidad mapeada', async () => {
      mockSave.mockResolvedValue(doc);

      const result = await repository.create(activation, tracking);

      expect(modelMock).toHaveBeenCalledWith(
        expect.objectContaining({
          methodActivation: 'WEBPAY',
          state: 'PAYED',
          userId: 'user-1',
          documentType: 'BOLETA',
        }),
      );
      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(result).toEqual(activation);
    });

    it('debe trazar y re-lanzar el error si el guardado falla', async () => {
      mockSave.mockRejectedValue(new Error('DB down'));

      await expect(repository.create(activation, tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'create:error',
        expect.any(Error),
      );
    });
  });

  describe('getAll', () => {
    it('debe filtrar por sendDocument cuando el search es "true"', async () => {
      mockFind.mockReturnValue(mockQuery([doc]));
      mockCountDocuments.mockResolvedValue(1);

      const result = await repository.getAll(1, 10, 'true', undefined, tracking);

      expect(mockFind).toHaveBeenCalledWith({ sendDocument: true });
      expect(mockCountDocuments).toHaveBeenCalledWith({ sendDocument: true });
      expect(result.data).toEqual([activation]);
    });

    it('debe filtrar por sendDocument false cuando el search es "false"', async () => {
      mockFind.mockReturnValue(mockQuery([]));
      mockCountDocuments.mockResolvedValue(0);

      await repository.getAll(1, 10, 'FALSE', undefined, tracking);

      expect(mockFind).toHaveBeenCalledWith({ sendDocument: false });
    });

    it('debe aplicar búsqueda por texto con $or cuando el search no es booleano', async () => {
      mockFind.mockReturnValue(mockQuery([]));
      mockCountDocuments.mockResolvedValue(0);

      await repository.getAll(1, 10, 'admin', undefined, tracking);

      expect(mockFind).toHaveBeenCalledWith({
        $or: [
          { descriptionAdministrator: { $regex: 'admin', $options: 'i' } },
          { 'WebpayTransaction.id': { $regex: 'admin', $options: 'i' } },
        ],
      });
    });

    it('debe consultar sin filtros cuando no hay search', async () => {
      mockFind.mockReturnValue(mockQuery([]));
      mockCountDocuments.mockResolvedValue(0);

      await repository.getAll(1, 10, undefined, undefined, tracking);

      expect(mockFind).toHaveBeenCalledWith({});
    });

    it('debe aplicar el filtro de methodActivation cuando viene', async () => {
      mockFind.mockReturnValue(mockQuery([]));
      mockCountDocuments.mockResolvedValue(0);

      await repository.getAll(1, 10, undefined, 'WEBPAY', tracking);

      expect(mockFind).toHaveBeenCalledWith({ methodActivation: 'WEBPAY' });
    });

    it('debe calcular totalPages, hasNextPage y hasPrevPage correctamente', async () => {
      mockFind.mockReturnValue(mockQuery([doc]));
      mockCountDocuments.mockResolvedValue(25);

      const result = await repository.getAll(2, 10, undefined, undefined, tracking);

      expect(result.totalPages).toBe(3);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPrevPage).toBe(true);
    });

    it('debe trazar y re-lanzar el error si la consulta falla', async () => {
      mockFind.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('DB down')),
      });

      await expect(repository.getAll(1, 10, undefined, undefined, tracking)).rejects.toThrow(
        'DB down',
      );
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getAll:error',
        expect.any(Error),
      );
    });
  });

  describe('getById', () => {
    it('debe retornar la entidad mapeada cuando encuentra el documento', async () => {
      mockFindById.mockReturnValue(mockQuery(doc));

      const result = await repository.getById('act-1', tracking);

      expect(mockFindById).toHaveBeenCalledWith('act-1');
      expect(result).toEqual(activation);
    });

    it('debe retornar null cuando no encuentra el documento', async () => {
      mockFindById.mockReturnValue(mockQuery(null));

      const result = await repository.getById('act-inexistente', tracking);

      expect(result).toBeNull();
    });

    it('debe trazar y re-lanzar el error si la consulta falla', async () => {
      mockFindById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('DB down')),
      });

      await expect(repository.getById('act-1', tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getById:error',
        expect.any(Error),
      );
    });
  });

  describe('getByWebpayToken', () => {
    it('debe retornar la entidad mapeada cuando encuentra el token', async () => {
      mockFindOne.mockReturnValue(mockQuery(doc));

      const result = await repository.getByWebpayToken('tok-1', tracking);

      expect(mockFindOne).toHaveBeenCalledWith({ 'WebpayTransaction.id': 'tok-1' });
      expect(result).toEqual(activation);
    });

    it('debe retornar null cuando no encuentra el token', async () => {
      mockFindOne.mockReturnValue(mockQuery(null));

      const result = await repository.getByWebpayToken('tok-inexistente', tracking);

      expect(result).toBeNull();
    });

    it('debe trazar y re-lanzar el error si la consulta falla', async () => {
      mockFindOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('DB down')),
      });

      await expect(repository.getByWebpayToken('tok-1', tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getByWebpayToken:error',
        expect.any(Error),
      );
    });
  });

  describe('update', () => {
    it('debe actualizar con $set y retornar la entidad mapeada', async () => {
      const updatedDoc = { ...doc, state: ActivationState.ACTIVE };
      mockFindByIdAndUpdate.mockReturnValue(mockQuery(updatedDoc));

      const result = await repository.update('act-1', { state: ActivationState.ACTIVE }, tracking);

      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        'act-1',
        { $set: expect.objectContaining({ state: ActivationState.ACTIVE }) },
        { new: true },
      );
      expect(result).toEqual({ ...activation, state: ActivationState.ACTIVE });
    });

    it('debe retornar null cuando no encuentra el documento a actualizar', async () => {
      mockFindByIdAndUpdate.mockReturnValue(mockQuery(null));

      const result = await repository.update(
        'act-inexistente',
        { state: ActivationState.ACTIVE },
        tracking,
      );

      expect(result).toBeNull();
    });

    it('debe trazar y re-lanzar el error si la actualización falla', async () => {
      mockFindByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DB down')),
      });

      await expect(
        repository.update('act-1', { state: ActivationState.ACTIVE }, tracking),
      ).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'update:error',
        expect.any(Error),
      );
    });
  });

  describe('delete', () => {
    it('debe retornar true cuando el documento fue eliminado', async () => {
      mockFindByIdAndDelete.mockReturnValue(mockQuery(doc));

      const result = await repository.delete('act-1', tracking);

      expect(mockFindByIdAndDelete).toHaveBeenCalledWith('act-1');
      expect(result).toBe(true);
    });

    it('debe retornar false cuando no existe el documento', async () => {
      mockFindByIdAndDelete.mockReturnValue(mockQuery(null));

      const result = await repository.delete('act-inexistente', tracking);

      expect(result).toBe(false);
    });

    it('debe trazar y re-lanzar el error si la eliminación falla', async () => {
      mockFindByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DB down')),
      });

      await expect(repository.delete('act-1', tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'delete:error',
        expect.any(Error),
      );
    });
  });
});