import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UpdateWebpayQrActivateUseCase } from './update-webpay-qr-activate.usecase';
import { CommitTransactionUseCase } from '../../../webpay/application/use-cases/commit-transaction.usecase';
import { QrActivatedNotificationService } from '../services/qr-activated-notification.service';
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
  let notificationService: jest.Mocked<QrActivatedNotificationService>;
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
            activateMany: jest.fn(),
          },
        },
        {
          provide: CommitTransactionUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: QrActivatedNotificationService,
          useValue: {
            notify: jest.fn(),
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
    notificationService = module.get(QrActivatedNotificationService);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe marcar como PAYED, activar los QRs en batch y actualizar la transacción cuando el pago es autorizado', async () => {
      reader.getByWebpayToken.mockResolvedValue(mockActivation);
      commitTransactionUseCase.execute.mockResolvedValue(mockCommitAuthorized);
      qrActivator.activateMany.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
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
      // Batch: 1 sola llamada con todos los códigos, esperada (no fire-and-forget)
      expect(qrActivator.activateMany).toHaveBeenCalledTimes(1);
      expect(qrActivator.activateMany).toHaveBeenCalledWith(
        ['qr-1'],
        expirationDate,
        tracking,
      );
      expect(qrActivator.updateQr).not.toHaveBeenCalled();
      expect(updater.update).toHaveBeenCalledWith(
        'act-1',
        {
          state: ActivationState.PAYED,
          activationDate: expect.any(Date), // SPEC-019 RF-8
          WebpayTransaction: {
            ...mockActivation.WebpayTransaction,
            state: WebpayState.ACTIVE,
          },
        },
        tracking,
      );
      expect(result.state).toBe(ActivationState.PAYED);
    });

    it('debe notificar el correo de activación con la activación actualizada (SPEC-019 RF-5)', async () => {
      reader.getByWebpayToken.mockResolvedValue(mockActivation);
      commitTransactionUseCase.execute.mockResolvedValue(mockCommitAuthorized);
      qrActivator.activateMany.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
      const updatedActivation: QrActivate = {
        ...mockActivation,
        state: ActivationState.PAYED,
        activationDate: new Date('2026-08-17T12:00:00Z'),
        WebpayTransaction: { ...mockActivation.WebpayTransaction, state: WebpayState.ACTIVE },
      };
      updater.update.mockResolvedValue(updatedActivation);

      const result = await useCase.execute('token-ws-1', tracking);

      expect(notificationService.notify).toHaveBeenCalledTimes(1);
      expect(notificationService.notify).toHaveBeenCalledWith(updatedActivation, tracking);
      expect(result).toEqual(updatedActivation);
    });

    it('debe persistir PAYED y no fallar si el correo de activación falla (best-effort, ADR-019.2)', async () => {
      reader.getByWebpayToken.mockResolvedValue(mockActivation);
      commitTransactionUseCase.execute.mockResolvedValue(mockCommitAuthorized);
      qrActivator.activateMany.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
      updater.update.mockResolvedValue({
        ...mockActivation,
        state: ActivationState.PAYED,
        activationDate: new Date(),
        WebpayTransaction: { ...mockActivation.WebpayTransaction, state: WebpayState.ACTIVE },
      });
      notificationService.notify.mockRejectedValue(new Error('SMTP caído'));

      const result = await useCase.execute('token-ws-1', tracking);

      expect(updater.update).toHaveBeenCalledTimes(1);
      expect(result.state).toBe(ActivationState.PAYED);
    });

    it('debe activar todos los QRs de la compra en 1 operación batch (N QRs)', async () => {
      const multiQrActivation: QrActivate = {
        ...mockActivation,
        qrList: [
          { qrCode: 'qr-1', price: 50, expirationDate, duration: '6 meses' },
          { qrCode: 'qr-2', price: 50, expirationDate, duration: '6 meses' },
        ],
      };
      reader.getByWebpayToken.mockResolvedValue(multiQrActivation);
      commitTransactionUseCase.execute.mockResolvedValue(mockCommitAuthorized);
      qrActivator.activateMany.mockResolvedValue({ matchedCount: 2, modifiedCount: 2 });
      updater.update.mockResolvedValue({
        ...multiQrActivation,
        state: ActivationState.PAYED,
        WebpayTransaction: { ...multiQrActivation.WebpayTransaction, state: WebpayState.ACTIVE },
      });

      await useCase.execute('token-ws-1', tracking);

      expect(qrActivator.activateMany).toHaveBeenCalledTimes(1);
      expect(qrActivator.activateMany).toHaveBeenCalledWith(
        ['qr-1', 'qr-2'],
        expirationDate,
        tracking,
      );
      expect(qrActivator.updateQr).not.toHaveBeenCalled();
    });

    it('debe avisar con warn si hay QRs inexistentes (matchedCount < total) pero igual guardar PAYED', async () => {
      reader.getByWebpayToken.mockResolvedValue(mockActivation);
      commitTransactionUseCase.execute.mockResolvedValue(mockCommitAuthorized);
      qrActivator.activateMany.mockResolvedValue({ matchedCount: 0, modifiedCount: 0 });
      updater.update.mockResolvedValue({
        ...mockActivation,
        state: ActivationState.PAYED,
        WebpayTransaction: { ...mockActivation.WebpayTransaction, state: WebpayState.ACTIVE },
      });

      const result = await useCase.execute('token-ws-1', tracking);

      expect(traceService.warn).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'UpdateWebpayQrActivateUseCase - QRs inexistentes',
        { token_ws: 'token-ws-1', total: 1, matchedCount: 0, modifiedCount: 0 },
      );
      expect(updater.update).toHaveBeenCalledWith(
        'act-1',
        expect.objectContaining({ state: ActivationState.PAYED }),
        tracking,
      );
      expect(result.state).toBe(ActivationState.PAYED);
    });

    it('debe esperar la activación batch ANTES de persistir PAYED (RF-2)', async () => {
      reader.getByWebpayToken.mockResolvedValue(mockActivation);
      commitTransactionUseCase.execute.mockResolvedValue(mockCommitAuthorized);
      updater.update.mockResolvedValue({
        ...mockActivation,
        state: ActivationState.PAYED,
        WebpayTransaction: { ...mockActivation.WebpayTransaction, state: WebpayState.ACTIVE },
      });

      // Verificar orden: activateMany resuelve antes que updater.update
      let activateResolved = false;
      qrActivator.activateMany.mockImplementation(async () => {
        activateResolved = true;
        return { matchedCount: 1, modifiedCount: 1 };
      });
      updater.update.mockImplementation(async () => {
        expect(activateResolved).toBe(true);
        return {
          ...mockActivation,
          state: ActivationState.PAYED,
          WebpayTransaction: {
            ...mockActivation.WebpayTransaction,
            state: WebpayState.ACTIVE,
          },
        } as never;
      });

      await useCase.execute('token-ws-1', tracking);

      expect(activateResolved).toBe(true);
    });

    it('debe propagar el error si la activación batch falla (no guarda PAYED)', async () => {
      reader.getByWebpayToken.mockResolvedValue(mockActivation);
      commitTransactionUseCase.execute.mockResolvedValue(mockCommitAuthorized);
      qrActivator.activateMany.mockRejectedValue(new Error('DB down'));

      await expect(useCase.execute('token-ws-1', tracking)).rejects.toThrow('DB down');
      expect(updater.update).not.toHaveBeenCalled();
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

      expect(qrActivator.activateMany).not.toHaveBeenCalled();
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
      expect(notificationService.notify).not.toHaveBeenCalled(); // CA-05: FAILED no notifica
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
      qrActivator.activateMany.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
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

    it('debe ser idempotente ante carrera: si el commit falla (422) y la otra request persiste PAYED, devuelve su estado sin error', async () => {
      jest.useFakeTimers();
      const alreadyPayed: QrActivate = {
        ...mockActivation,
        state: ActivationState.PAYED,
        activationDate: new Date('2026-08-17T21:37:03.556Z'),
      };
      reader.getByWebpayToken
        .mockResolvedValueOnce(mockActivation) // 1ª lectura: PENDING
        .mockResolvedValueOnce(mockActivation) // re-lectura 1: aún PENDING (la otra request no ha persistido)
        .mockResolvedValueOnce(alreadyPayed); // re-lectura 2: PAYED
      commitTransactionUseCase.execute.mockRejectedValue(
        new Error('Request failed with status code 422'),
      );

      const promise = useCase.execute('token-ws-1', tracking);
      await jest.advanceTimersByTimeAsync(500); // 1ª espera del polling
      await jest.advanceTimersByTimeAsync(500); // 2ª espera del polling
      const result = await promise;
      jest.useRealTimers();

      expect(result.state).toBe(ActivationState.PAYED);
      expect(commitTransactionUseCase.execute).toHaveBeenCalledTimes(1);
      expect(reader.getByWebpayToken).toHaveBeenCalledTimes(3);
      expect(updater.update).not.toHaveBeenCalled();
      expect(notificationService.notify).not.toHaveBeenCalled();
    });

    it('debe re-lanzar el error si el commit falla (422) y la activación sigue PENDING tras el polling (fallo real)', async () => {
      jest.useFakeTimers();
      reader.getByWebpayToken.mockResolvedValue(mockActivation); // siempre PENDING
      commitTransactionUseCase.execute.mockRejectedValue(
        new Error('Request failed with status code 422'),
      );

      const promise = useCase.execute('token-ws-1', tracking);
      const assertion = expect(promise).rejects.toThrow('422'); // adjunta el handler antes de avanzar timers
      await jest.advanceTimersByTimeAsync(6000); // 10 intentos × 500ms
      await assertion;
      jest.useRealTimers();

      expect(reader.getByWebpayToken).toHaveBeenCalledTimes(12); // 1 inicial + 1 re-lectura + 10 del polling
      expect(updater.update).not.toHaveBeenCalled();
    });
  });
});