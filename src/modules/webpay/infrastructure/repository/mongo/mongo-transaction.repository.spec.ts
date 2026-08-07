import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoTransactionRepository } from './mongo-transaction.repository';
import { TransactionSchema, TransactionDocument } from './schemas/transaction.schema';
import { TraceService, TraceLayer } from '../../../../../common/services/trace.service';
import type { TrackingContext } from '../../../../../common/decorators/tracking.decorator';
import type { WebpayTransaction } from '../../../domain/entities/webpay-transaction.entity';

const mockSave = jest.fn();
const mockFindOne = jest.fn();
const mockFindOneAndUpdate = jest.fn();

const modelMock = jest.fn().mockImplementation((data: Record<string, unknown>) => ({
  ...data,
  save: mockSave,
})) as unknown as Model<TransactionDocument>;

(modelMock as unknown as Record<string, unknown>).findOne = mockFindOne;
(modelMock as unknown as Record<string, unknown>).findOneAndUpdate = mockFindOneAndUpdate;

describe('MongoTransactionRepository', () => {
  let repository: MongoTransactionRepository;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const doc = {
    _id: { toString: () => 'tx-id-1' },
    token: 'tok-1',
    amount: 5000,
    buyOrder: 'BO-1',
    sessionId: 'S-1',
    status: 'INITIALIZED',
  };

  const transaction: WebpayTransaction = {
    id: 'tx-id-1',
    token: 'tok-1',
    amount: 5000,
    buyOrder: 'BO-1',
    sessionId: 'S-1',
    status: 'INITIALIZED',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongoTransactionRepository,
        {
          provide: getModelToken(TransactionSchema.name),
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

    repository = module.get(MongoTransactionRepository);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('debe crear el documento con el mapper y retornar la entidad mapeada', async () => {
      mockSave.mockResolvedValue(doc);

      const result = await repository.create(transaction, tracking);

      expect(modelMock).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'tok-1',
          amount: 5000,
          buyOrder: 'BO-1',
          sessionId: 'S-1',
          status: 'INITIALIZED',
        }),
      );
      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(result).toEqual(transaction);
    });

    it('debe trazar y re-lanzar el error si el guardado falla', async () => {
      mockSave.mockRejectedValue(new Error('DB down'));

      await expect(repository.create(transaction, tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'create:error',
        expect.any(Error),
      );
    });
  });

  describe('getByToken', () => {
    it('debe retornar la entidad mapeada cuando encuentra el documento', async () => {
      mockFindOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });

      const result = await repository.getByToken('tok-1', tracking);

      expect(mockFindOne).toHaveBeenCalledWith({ token: 'tok-1' });
      expect(result).toEqual(transaction);
    });

    it('debe retornar null cuando no encuentra el documento', async () => {
      mockFindOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const result = await repository.getByToken('tok-inexistente', tracking);

      expect(result).toBeNull();
    });

    it('debe trazar y re-lanzar el error si la consulta falla', async () => {
      mockFindOne.mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('DB down')) });

      await expect(repository.getByToken('tok-1', tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getByToken:error',
        expect.any(Error),
      );
    });
  });

  describe('updateByToken', () => {
    it('debe actualizar con $set y retornar la entidad mapeada', async () => {
      const updatedDoc = { ...doc, status: 'AUTHORIZED' };
      mockFindOneAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(updatedDoc) });

      const result = await repository.updateByToken(
        'tok-1',
        { status: 'AUTHORIZED' },
        tracking,
      );

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { token: 'tok-1' },
        { $set: expect.objectContaining({ status: 'AUTHORIZED' }) },
        { new: true },
      );
      expect(result).toEqual({ ...transaction, status: 'AUTHORIZED' });
    });

    it('debe retornar null cuando no encuentra el documento a actualizar', async () => {
      mockFindOneAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const result = await repository.updateByToken('tok-1', { status: 'REFUNDED' }, tracking);

      expect(result).toBeNull();
    });

    it('debe trazar y re-lanzar el error si la actualización falla', async () => {
      mockFindOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DB down')),
      });

      await expect(
        repository.updateByToken('tok-1', { status: 'REFUNDED' }, tracking),
      ).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'updateByToken:error',
        expect.any(Error),
      );
    });
  });
});