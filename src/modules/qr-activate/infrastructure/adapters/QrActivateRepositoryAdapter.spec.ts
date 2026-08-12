import { Test, TestingModule } from '@nestjs/testing';
import { QrActivateRepositoryAdapter } from './QrActivateRepositoryAdapter';
import { MongoQrActivateRepository } from '../repository/mongo/mongo-qr-activate.repository';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import {
  MethodActivation,
  ActivationState,
  DocumentType,
  type QrActivate,
} from '../../domain/entities/qr-activate.entity';

describe('QrActivateRepositoryAdapter', () => {
  let adapter: QrActivateRepositoryAdapter;
  let mongoRepository: jest.Mocked<MongoQrActivateRepository>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const activation: QrActivate = {
    id: 'act-1',
    methodActivation: MethodActivation.WEBPAY,
    state: ActivationState.PAYED,
    price: { TotalPrice: 5000, TotalTax: 500 },
    userId: 'user-1',
    qrList: [
      {
        qrCode: 'qr-1',
        price: 5000,
        expirationDate: new Date('2025-08-01T12:00:00.000Z'),
        duration: '1M',
      },
    ],
    documentType: DocumentType.BOLETA,
    sendDocument: true,
  };

  const paginated = {
    data: [activation],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QrActivateRepositoryAdapter,
        {
          provide: MongoQrActivateRepository,
          useValue: {
            create: jest.fn(),
            getAll: jest.fn(),
            getById: jest.fn(),
            getByWebpayToken: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    adapter = module.get(QrActivateRepositoryAdapter);
    mongoRepository = module.get(MongoQrActivateRepository);
  });

  it('debe estar definido', () => {
    expect(adapter).toBeDefined();
  });

  describe('create', () => {
    it('debe delegar la creación al repositorio mongo', async () => {
      mongoRepository.create.mockResolvedValue(activation);

      const result = await adapter.create(activation, tracking);

      expect(mongoRepository.create).toHaveBeenCalledWith(activation, tracking);
      expect(result).toEqual(activation);
    });
  });

  describe('getAll', () => {
    it('debe delegar la consulta paginada al repositorio mongo', async () => {
      mongoRepository.getAll.mockResolvedValue(paginated);

      const result = await adapter.getAll(1, 10, 'admin', 'WEBPAY', undefined, tracking);

      expect(mongoRepository.getAll).toHaveBeenCalledWith(1, 10, 'admin', 'WEBPAY', undefined, tracking);
      expect(result).toEqual(paginated);
    });
  });

  describe('getById', () => {
    it('debe delegar la consulta por id al repositorio mongo', async () => {
      mongoRepository.getById.mockResolvedValue(activation);

      const result = await adapter.getById('act-1', tracking);

      expect(mongoRepository.getById).toHaveBeenCalledWith('act-1', tracking);
      expect(result).toEqual(activation);
    });

    it('debe retornar null cuando el repositorio no encuentra la activación', async () => {
      mongoRepository.getById.mockResolvedValue(null);

      const result = await adapter.getById('act-inexistente', tracking);

      expect(result).toBeNull();
    });
  });

  describe('getByWebpayToken', () => {
    it('debe delegar la consulta por token al repositorio mongo', async () => {
      mongoRepository.getByWebpayToken.mockResolvedValue(activation);

      const result = await adapter.getByWebpayToken('tok-1', tracking);

      expect(mongoRepository.getByWebpayToken).toHaveBeenCalledWith('tok-1', tracking);
      expect(result).toEqual(activation);
    });

    it('debe retornar null cuando el repositorio no encuentra el token', async () => {
      mongoRepository.getByWebpayToken.mockResolvedValue(null);

      const result = await adapter.getByWebpayToken('tok-inexistente', tracking);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('debe delegar la actualización al repositorio mongo', async () => {
      const updated = { ...activation, state: ActivationState.ACTIVE };
      mongoRepository.update.mockResolvedValue(updated);

      const result = await adapter.update('act-1', { state: ActivationState.ACTIVE }, tracking);

      expect(mongoRepository.update).toHaveBeenCalledWith(
        'act-1',
        { state: ActivationState.ACTIVE },
        tracking,
      );
      expect(result).toEqual(updated);
    });

    it('debe retornar null cuando el repositorio no actualiza nada', async () => {
      mongoRepository.update.mockResolvedValue(null);

      const result = await adapter.update(
        'act-inexistente',
        { state: ActivationState.ACTIVE },
        tracking,
      );

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('debe delegar la eliminación al repositorio mongo', async () => {
      mongoRepository.delete.mockResolvedValue(true);

      const result = await adapter.delete('act-1', tracking);

      expect(mongoRepository.delete).toHaveBeenCalledWith('act-1', tracking);
      expect(result).toBe(true);
    });

    it('debe retornar false cuando el repositorio no elimina nada', async () => {
      mongoRepository.delete.mockResolvedValue(false);

      const result = await adapter.delete('act-inexistente', tracking);

      expect(result).toBe(false);
    });
  });
});