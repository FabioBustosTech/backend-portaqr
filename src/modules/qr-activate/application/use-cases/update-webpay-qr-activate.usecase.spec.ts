import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UpdateWebpayQrActivateUseCase } from './update-webpay-qr-activate.usecase';
import { CommitTransactionUseCase } from '../../../webpay/application/use-cases/commit-transaction.usecase';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import {
  QR_ACTIVATE_GET_PORT,
  QR_ACTIVATE_UPDATE_PORT,
  QR_ACTIVATE_QR_PORT,
} from '../../domain/constants/qr-activate.tokens';
import type {
  ICanGetQrActivate,
  ICanUpdateQrActivate,
  ICanActivateQr,
} from '../../domain/ports/queries/qr-activate.port';
import {
  MethodActivation,
  ActivationState,
  DocumentType,
  WebpayState,
} from '../../domain/entities/qr-activate.entity';
import type { QrActivate } from '../../domain/entities/qr-activate.entity';
import type { CommitTransactionMapped } from '../../../webpay/application/use-cases/commit-transaction.usecase';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';

describe('UpdateWebpayQrActivateUseCase', () => {
  let useCase: UpdateWebpayQrActivateUseCase;
  let reader: jest.Mocked<ICanGetQrActivate>;
  let updater: jest.Mocked<ICanUpdateQrActivate>;
  let qrActivator: jest.Mocked<ICanActivateQr>;
  let commitTransactionUseCase: jest.Mocked<CommitTransactionUseCase>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const expirationDate = new Date('2024-12-31T23:59:59.999Z');

  const mockActivation: QrActivate = {
    id: 'act-1',
    methodActivation: MethodActivation.WEBPAY,
    state: ActivationState.PENDING,
    price: { TotalPrice: 100, TotalTax: 19 },
    userId: 'user-1',
    qrList: [
      {
        qrCode: 'qr-1',
        price: 100,
        expirationDate,
        duration: '12 meses',
      },
    ],
    documentType: DocumentType.BOLETA,
    WebpayTransaction: { id: 'tx-1', state: WebpayState.PENDING },
  };

  const mockCommitAuthorized: CommitTransactionMapped = {
    id: 'tx-1',
    amount: 100,
    status: 'AUTHORIZED',
    buyOrder: 'bo-1',
    sessionId: 's-1',
  };

  const mockCommitFailed: CommitTransactionMapped = {
    id: 'tx-1',
    amount: 100,
    status: 'FAILED',
    buyOrder: 'bo-1',
    sessionId: 's-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateWebpayQrActivateUseCase,
        {
          provide: QR_ACTIVATE_GET_PORT,
          useValue: {
            getAll: jest.fn(),
            getById: jest.fn(),
            getByWebpayToken: jest.fn(),
          },
        },
        {
          provide: QR_ACTIVATE_UPDATE_PORT,
          useValue: {
            update: jest.fn(),
          },
        },
        {
          provide: QR_ACTIVATE_QR_PORT,
          useValue: {
            updateQr: jest.fn(),
          },
        },
        {
          provide: CommitTransactionUseCase,
          useValue: {
            execute: jest.fn(),
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

    useCase = module.get<UpdateWebpayQrActivateUseCase>(UpdateWebpayQrActivateUseCase);
    reader = module.get(QR_ACTIVATE_GET_PORT);
    updater = module.get(QR_ACTIVATE_UPDATE_PORT);
    qrActivator = module.get(QR_ACTIVATE_QR_PORT);
    commitTransactionUseCase = module.get(CommitTransactionUseCase);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe marcar como PAYED, activar los QRs y actualizar la transacción cuando el pago es autorizado', async () => {
      reader.getByWebpayToken.mockResolvedValue(mockActivation);
      commitTransactionUseCase.execute.mockResolvedValue(mockCommitAuthorized);
      updater.update.mockResolvedValue({
        ...mockActivation,
        state: ActivationState.PAYED,
        WebpayTransaction: { ...mockActivation.WebpayTransaction, state: WebpayState.ACTIVE },
      });

      const result = await useCase.execute('token-ws-1', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'UpdateWebpayQrActivateUseCase',
        { token_ws: 'token-ws-1' },
      );
      expect(reader.getByWebpayToken).toHaveBeenCalledWith('token-ws-1', tracking);
      expect(commitTransactionUseCase.execute).toHaveBeenCalledWith(
        'token-ws-1',
        tracking,
      );
      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'UpdateWebpayQrActivateUseCase - PAGADO',
        { token_ws: 'token-ws-1' },
      );
      expect(qrActivator.updateQr).toHaveBeenCalledWith(
        'qr-1',
        { active: true, expiration: expirationDate },
        tracking,
      );
      expect(updater.update).toHaveBeenCalledWith(
        'act-1',
        {
          state: ActivationState.PAYED,
          WebpayTransaction: {
            ...mockActivation.WebpayTransaction,
            state: WebpayState.ACTIVE,
          },
        },
        tracking,
      );
      expect(result.state).toBe(ActivationState.PAYED);
    });

    it('debe marcar como FAILED y no activar QRs cuando el pago no es autorizado', async () => {
      reader.getByWebpayToken.mockResolvedValue(mockActivation);
      commitTransactionUseCase.execute.mockResolvedValue(mockCommitFailed);
      updater.update.mockResolvedValue({
        ...mockActivation,
        state: ActivationState.FAILED,
        WebpayTransaction: { ...mockActivation.WebpayTransaction, state: WebpayState.FAILED },
      });

      const result = await useCase.execute('token-ws-1', tracking);

      expect(qrActivator.updateQr).not.toHaveBeenCalled();
      expect(updater.update).toHaveBeenCalledWith(
        'act-1',
        {
          state: ActivationState.FAILED,
          WebpayTransaction: {
            ...mockActivation.WebpayTransaction,
            state: WebpayState.FAILED,
          },
        },
        tracking,
      );
      expect(result.state).toBe(ActivationState.FAILED);
    });

    it('debe lanzar NotFoundException si no existe activación para el token', async () => {
      reader.getByWebpayToken.mockResolvedValue(null);

      await expect(useCase.execute('token-ws-1', tracking)).rejects.toThrow(
        NotFoundException,
      );
      await expect(useCase.execute('token-ws-1', tracking)).rejects.toThrow(
        'Activación con token_ws token-ws-1 no encontrada',
      );
      expect(commitTransactionUseCase.execute).not.toHaveBeenCalled();
    });

    it('debe retornar la activación sin cambios si ya fue procesada (estado distinto de PENDING)', async () => {
      const processedActivation: QrActivate = {
        ...mockActivation,
        state: ActivationState.PAYED,
      };
      reader.getByWebpayToken.mockResolvedValue(processedActivation);

      const result = await useCase.execute('token-ws-1', tracking);

      expect(traceService.warn).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'UpdateWebpayQrActivateUseCase - ya procesada',
        { token_ws: 'token-ws-1' },
      );
      expect(commitTransactionUseCase.execute).not.toHaveBeenCalled();
      expect(updater.update).not.toHaveBeenCalled();
      expect(result).toEqual(processedActivation);
    });

    it('debe lanzar Error si el commit de Webpay no retorna resultado', async () => {
      reader.getByWebpayToken.mockResolvedValue(mockActivation);
      commitTransactionUseCase.execute.mockResolvedValue(null);

      await expect(useCase.execute('token-ws-1', tracking)).rejects.toThrow(
        'Error al actualizar Webpay transaction',
      );
      expect(updater.update).not.toHaveBeenCalled();
    });

    it('debe lanzar Error si la actualización de la activación falla', async () => {
      reader.getByWebpayToken.mockResolvedValue(mockActivation);
      commitTransactionUseCase.execute.mockResolvedValue(mockCommitAuthorized);
      updater.update.mockResolvedValue(null);

      await expect(useCase.execute('token-ws-1', tracking)).rejects.toThrow(
        'Error al guardar la activación',
      );
    });

    it('debe propagar el error si el commit de Webpay falla', async () => {
      reader.getByWebpayToken.mockResolvedValue(mockActivation);
      commitTransactionUseCase.execute.mockRejectedValue(new Error('Webpay down'));

      await expect(useCase.execute('token-ws-1', tracking)).rejects.toThrow(
        'Webpay down',
      );
      expect(updater.update).not.toHaveBeenCalled();
    });
  });
});