import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { GetTransactionStatusUseCase } from './get-transaction-status.usecase';
import type { ICanGetTransaction } from '../../domain/ports/queries/transaction.port';
import { TRANSACTION_GET_PORT } from '../../domain/constants/webpay.tokens';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import type { WebpayTransaction } from '../../domain/entities/webpay-transaction.entity';

describe('GetTransactionStatusUseCase', () => {
  let useCase: GetTransactionStatusUseCase;
  let reader: jest.Mocked<ICanGetTransaction>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const mockTransaction: WebpayTransaction = {
    id: 'tx-1',
    token: 'tok-1',
    amount: 5000,
    buyOrder: 'BO-1',
    sessionId: 'S-1',
    status: 'AUTHORIZED',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetTransactionStatusUseCase,
        {
          provide: TRANSACTION_GET_PORT,
          useValue: {
            getByToken: jest.fn(),
          },
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

    useCase = module.get(GetTransactionStatusUseCase);
    reader = module.get(TRANSACTION_GET_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe retornar la transacción encontrada por token', async () => {
      reader.getByToken.mockResolvedValue(mockTransaction);

      const result = await useCase.execute('tok-1', tracking);

      expect(reader.getByToken).toHaveBeenCalledWith('tok-1', tracking);
      expect(result).toEqual(mockTransaction);
    });

    it('debe retornar null si no existe la transacción', async () => {
      reader.getByToken.mockResolvedValue(null);

      const result = await useCase.execute('tok-inexistente', tracking);

      expect(result).toBeNull();
    });

    it('debe lanzar InternalServerErrorException si el port falla', async () => {
      reader.getByToken.mockRejectedValue(new Error('DB down'));

      await expect(useCase.execute('tok-1', tracking)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'GetTransactionStatusUseCase - error',
        expect.any(Error),
      );
    });
  });

  describe('getFromDB', () => {
    it('debe retornar la transacción directamente desde el port', async () => {
      reader.getByToken.mockResolvedValue(mockTransaction);

      const result = await useCase.getFromDB('tok-1', tracking);

      expect(reader.getByToken).toHaveBeenCalledWith('tok-1', tracking);
      expect(result).toEqual(mockTransaction);
    });

    it('debe registrar el acceso en el TraceService', async () => {
      reader.getByToken.mockResolvedValue(mockTransaction);

      await useCase.getFromDB('tok-1', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'GetTransactionStatusUseCase - getFromDB',
        { token: 'tok-1' },
      );
    });

    it('debe propagar el error del port sin envolverlo', async () => {
      reader.getByToken.mockRejectedValue(new Error('DB down'));

      await expect(useCase.getFromDB('tok-1', tracking)).rejects.toThrow('DB down');
    });
  });
});