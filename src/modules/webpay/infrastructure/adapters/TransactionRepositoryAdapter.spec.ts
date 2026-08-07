import { Test, TestingModule } from '@nestjs/testing';
import { TransactionRepositoryAdapter } from './TransactionRepositoryAdapter';
import { MongoTransactionRepository } from '../repository/mongo/mongo-transaction.repository';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import type { WebpayTransaction } from '../../domain/entities/webpay-transaction.entity';

describe('TransactionRepositoryAdapter', () => {
  let adapter: TransactionRepositoryAdapter;
  let mongoRepository: jest.Mocked<MongoTransactionRepository>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const transaction: WebpayTransaction = {
    id: 'tx-1',
    token: 'tok-1',
    amount: 5000,
    buyOrder: 'BO-1',
    sessionId: 'S-1',
    status: 'INITIALIZED',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionRepositoryAdapter,
        {
          provide: MongoTransactionRepository,
          useValue: {
            create: jest.fn(),
            getByToken: jest.fn(),
            updateByToken: jest.fn(),
          },
        },
      ],
    }).compile();

    adapter = module.get(TransactionRepositoryAdapter);
    mongoRepository = module.get(MongoTransactionRepository);
  });

  it('debe estar definido', () => {
    expect(adapter).toBeDefined();
  });

  describe('create', () => {
    it('debe delegar la creación al repositorio mongo', async () => {
      mongoRepository.create.mockResolvedValue(transaction);

      const result = await adapter.create(transaction, tracking);

      expect(mongoRepository.create).toHaveBeenCalledWith(transaction, tracking);
      expect(result).toEqual(transaction);
    });
  });

  describe('getByToken', () => {
    it('debe delegar la consulta por token al repositorio mongo', async () => {
      mongoRepository.getByToken.mockResolvedValue(transaction);

      const result = await adapter.getByToken('tok-1', tracking);

      expect(mongoRepository.getByToken).toHaveBeenCalledWith('tok-1', tracking);
      expect(result).toEqual(transaction);
    });

    it('debe retornar null cuando el repositorio no encuentra la transacción', async () => {
      mongoRepository.getByToken.mockResolvedValue(null);

      const result = await adapter.getByToken('tok-inexistente', tracking);

      expect(result).toBeNull();
    });
  });

  describe('updateByToken', () => {
    it('debe delegar la actualización por token al repositorio mongo', async () => {
      const updated = { ...transaction, status: 'AUTHORIZED' };
      mongoRepository.updateByToken.mockResolvedValue(updated);

      const result = await adapter.updateByToken(
        'tok-1',
        { status: 'AUTHORIZED' },
        tracking,
      );

      expect(mongoRepository.updateByToken).toHaveBeenCalledWith(
        'tok-1',
        { status: 'AUTHORIZED' },
        tracking,
      );
      expect(result).toEqual(updated);
    });

    it('debe retornar null cuando el repositorio no actualiza nada', async () => {
      mongoRepository.updateByToken.mockResolvedValue(null);

      const result = await adapter.updateByToken('tok-1', { status: 'REFUNDED' }, tracking);

      expect(result).toBeNull();
    });
  });
});