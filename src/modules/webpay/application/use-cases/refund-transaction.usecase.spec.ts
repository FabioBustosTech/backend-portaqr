import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { RefundTransactionUseCase } from './refund-transaction.usecase';
import type { ICanUpdateTransaction } from '../../domain/ports/queries/transaction.port';
import type { IWebpayGateway } from '../../infrastructure/adapters/transbank-webpay.gateway';
import {
  TRANSACTION_UPDATE_PORT,
  WEBPAY_GATEWAY_PORT,
} from '../../domain/constants/webpay.tokens';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { RefundTransactionDto } from '../dto/refund-transaction.dto';

describe('RefundTransactionUseCase', () => {
  let useCase: RefundTransactionUseCase;
  let updater: jest.Mocked<ICanUpdateTransaction>;
  let gateway: jest.Mocked<IWebpayGateway>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const dto: RefundTransactionDto = {
    token: 'tok-1',
    amount: 5000,
  };

  const refundResult = {
    type: 'REFUNDED',
    authorization_code: 'auth-1',
    authorization_date: '2024-08-01T12:00:00.000Z',
    nullified_amount: 5000,
    balance: 0,
    response_code: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundTransactionUseCase,
        {
          provide: TRANSACTION_UPDATE_PORT,
          useValue: {
            updateByToken: jest.fn(),
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

    useCase = module.get(RefundTransactionUseCase);
    updater = module.get(TRANSACTION_UPDATE_PORT);
    gateway = module.get(WEBPAY_GATEWAY_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe reembolsar en el gateway, marcar la transacción como REFUNDED y retornar el resultado', async () => {
      gateway.refund.mockResolvedValue(refundResult);
      updater.updateByToken.mockResolvedValue({
        id: 'tx-1',
        token: 'tok-1',
        amount: 5000,
        buyOrder: 'BO-1',
        sessionId: 'S-1',
        status: 'REFUNDED',
      });

      const result = await useCase.execute(dto, tracking);

      expect(gateway.refund).toHaveBeenCalledWith(dto.token, dto.amount, tracking);
      expect(updater.updateByToken).toHaveBeenCalledWith(
        dto.token,
        { status: 'REFUNDED' },
        tracking,
      );
      expect(result).toEqual(refundResult);
    });

    it('debe registrar el input en el TraceService', async () => {
      gateway.refund.mockResolvedValue(refundResult);
      updater.updateByToken.mockResolvedValue(null);

      await useCase.execute(dto, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'RefundTransactionUseCase',
        { token: dto.token, amount: dto.amount },
      );
    });

    it('debe lanzar InternalServerErrorException si el gateway falla', async () => {
      gateway.refund.mockRejectedValue(new Error('Transbank caído'));

      await expect(useCase.execute(dto, tracking)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(updater.updateByToken).not.toHaveBeenCalled();
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'RefundTransactionUseCase - error',
        expect.any(Error),
      );
    });

    it('debe lanzar InternalServerErrorException si la actualización falla', async () => {
      gateway.refund.mockResolvedValue(refundResult);
      updater.updateByToken.mockRejectedValue(new Error('DB down'));

      await expect(useCase.execute(dto, tracking)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(traceService.error).toHaveBeenCalled();
    });
  });
});