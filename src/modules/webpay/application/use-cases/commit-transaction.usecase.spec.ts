import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { CommitTransactionUseCase } from './commit-transaction.usecase';
import type { ICanUpdateTransaction } from '../../domain/ports/queries/transaction.port';
import type { IWebpayGateway, CommitTransactionResult } from '../../infrastructure/adapters/transbank-webpay.gateway';
import {
  TRANSACTION_GET_PORT,
  TRANSACTION_UPDATE_PORT,
  WEBPAY_GATEWAY_PORT,
} from '../../domain/constants/webpay.tokens';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import type { WebpayTransaction } from '../../domain/entities/webpay-transaction.entity';

describe('CommitTransactionUseCase', () => {
  let useCase: CommitTransactionUseCase;
  let updater: jest.Mocked<ICanUpdateTransaction>;
  let gateway: jest.Mocked<IWebpayGateway>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const commitResult: CommitTransactionResult = {
    amount: 5000,
    status: 'AUTHORIZED',
    buy_order: 'BO-1',
    session_id: 'S-1',
    transaction_date: new Date('2024-08-01T12:00:00.000Z'),
    payment_type_code: 'VD',
    authorization_code: 'auth-1',
    response_code: 0,
    vci: 'TSY',
    card_detail: { card_number: '6622' },
    accounting_date: '0801',
    installments_number: 1,
  };

  const updatedTransaction: WebpayTransaction = {
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
        CommitTransactionUseCase,
        {
          provide: TRANSACTION_GET_PORT,
          useValue: {
            getByToken: jest.fn(),
          },
        },
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

    useCase = module.get(CommitTransactionUseCase);
    updater = module.get(TRANSACTION_UPDATE_PORT);
    gateway = module.get(WEBPAY_GATEWAY_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe confirmar la transacción, mapearla, actualizarla y retornar el resultado con id', async () => {
      gateway.commitTransaction.mockResolvedValue(commitResult);
      updater.updateByToken.mockResolvedValue(updatedTransaction);

      const result = await useCase.execute('tok-1', tracking);

      expect(gateway.commitTransaction).toHaveBeenCalledWith('tok-1', tracking);
      expect(updater.updateByToken).toHaveBeenCalledWith(
        'tok-1',
        {
          amount: 5000,
          status: 'AUTHORIZED',
          buyOrder: 'BO-1',
          sessionId: 'S-1',
          transactionDate: new Date('2024-08-01T12:00:00.000Z'),
          paymentTypeCode: 'VD',
          authorizationCode: 'auth-1',
          responseCode: 0,
          vci: 'TSY',
          cardNumber: '6622',
          accountingDate: '0801',
          installmentsNumber: 1,
        },
        tracking,
      );
      expect(result).toEqual({
        amount: 5000,
        status: 'AUTHORIZED',
        buyOrder: 'BO-1',
        sessionId: 'S-1',
        transactionDate: new Date('2024-08-01T12:00:00.000Z'),
        paymentTypeCode: 'VD',
        authorizationCode: 'auth-1',
        responseCode: 0,
        vci: 'TSY',
        cardNumber: '6622',
        accountingDate: '0801',
        installmentsNumber: 1,
        id: 'tx-1',
      });
    });

    it('debe mapear sin transactionDate ni cardNumber cuando el gateway no los entrega', async () => {
      gateway.commitTransaction.mockResolvedValue({
        amount: 1000,
        status: 'FAILED',
        buy_order: 'BO-2',
        session_id: 'S-2',
      });
      updater.updateByToken.mockResolvedValue({ ...updatedTransaction, id: 'tx-2' });

      const result = await useCase.execute('tok-2', tracking);

      expect(result.transactionDate).toBeUndefined();
      expect(result.cardNumber).toBeUndefined();
      expect(result.installmentsNumber).toBeUndefined();
      expect(result.status).toBe('FAILED');
    });

    it('debe lanzar InternalServerErrorException si la transacción no se encuentra en BD', async () => {
      gateway.commitTransaction.mockResolvedValue(commitResult);
      updater.updateByToken.mockResolvedValue(null);

      await expect(useCase.execute('tok-1', tracking)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(traceService.warn).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'CommitTransactionUseCase - transacciÃ³n no encontrada',
        { token: 'tok-1' },
      );
    });

    it('debe lanzar InternalServerErrorException si el gateway falla', async () => {
      gateway.commitTransaction.mockRejectedValue(new Error('Transbank caído'));

      await expect(useCase.execute('tok-1', tracking)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(updater.updateByToken).not.toHaveBeenCalled();
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'CommitTransactionUseCase - error',
        expect.any(Error),
      );
    });

    it('debe lanzar InternalServerErrorException si la actualización falla', async () => {
      gateway.commitTransaction.mockResolvedValue(commitResult);
      updater.updateByToken.mockRejectedValue(new Error('DB down'));

      await expect(useCase.execute('tok-1', tracking)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(traceService.error).toHaveBeenCalled();
    });
  });
});