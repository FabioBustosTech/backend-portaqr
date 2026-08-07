import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { CreateTransactionUseCase } from './create-transaction.usecase';
import type { ICanCreateTransaction } from '../../domain/ports/queries/transaction.port';
import type { IWebpayGateway } from '../../infrastructure/adapters/transbank-webpay.gateway';
import {
  TRANSACTION_CREATE_PORT,
  WEBPAY_GATEWAY_PORT,
} from '../../domain/constants/webpay.tokens';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import type { WebpayTransaction } from '../../domain/entities/webpay-transaction.entity';

describe('CreateTransactionUseCase', () => {
  let useCase: CreateTransactionUseCase;
  let creator: jest.Mocked<ICanCreateTransaction>;
  let gateway: jest.Mocked<IWebpayGateway>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const dto: CreateTransactionDto = {
    amount: 5000,
    buyOrder: 'BO-1',
    returnUrl: 'https://front.local/return',
    sessionId: 'S-1',
  };

  const gatewayResult = { token: 'tok-1', url: 'https://webpay.local/pay' };

  const mockTransaction: WebpayTransaction = {
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
        CreateTransactionUseCase,
        {
          provide: TRANSACTION_CREATE_PORT,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: WEBPAY_GATEWAY_PORT,
          useValue: {
            createTransaction: jest.fn(),
            commitTransaction: jest.fn(),
            refund: jest.fn(),
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

    useCase = module.get(CreateTransactionUseCase);
    creator = module.get(TRANSACTION_CREATE_PORT);
    gateway = module.get(WEBPAY_GATEWAY_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe crear la transacción en el gateway, persistirla y retornar token y url', async () => {
      gateway.createTransaction.mockResolvedValue(gatewayResult);
      creator.create.mockResolvedValue(mockTransaction);

      const result = await useCase.execute(dto, tracking);

      expect(gateway.createTransaction).toHaveBeenCalledWith(
        dto.buyOrder,
        dto.sessionId,
        dto.amount,
        dto.returnUrl,
        tracking,
      );
      expect(creator.create).toHaveBeenCalledWith(
        {
          id: '',
          token: gatewayResult.token,
          amount: dto.amount,
          buyOrder: dto.buyOrder,
          sessionId: dto.sessionId,
          status: 'INITIALIZED',
        },
        tracking,
      );
      expect(result).toEqual(gatewayResult);
    });

    it('debe registrar el input y el resultado en el TraceService', async () => {
      gateway.createTransaction.mockResolvedValue(gatewayResult);
      creator.create.mockResolvedValue(mockTransaction);

      await useCase.execute(dto, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'CreateTransactionUseCase',
        { buyOrder: dto.buyOrder, amount: dto.amount },
      );
      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'CreateTransactionUseCase - creada',
        { token: gatewayResult.token },
      );
    });

    it('debe lanzar InternalServerErrorException si el gateway falla y trazar el error', async () => {
      gateway.createTransaction.mockRejectedValue(new Error('Transbank caído'));

      await expect(useCase.execute(dto, tracking)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(creator.create).not.toHaveBeenCalled();
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'CreateTransactionUseCase - error',
        expect.any(Error),
      );
    });

    it('debe lanzar InternalServerErrorException si la persistencia falla', async () => {
      gateway.createTransaction.mockResolvedValue(gatewayResult);
      creator.create.mockRejectedValue(new Error('DB down'));

      await expect(useCase.execute(dto, tracking)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(traceService.error).toHaveBeenCalled();
    });
  });
});