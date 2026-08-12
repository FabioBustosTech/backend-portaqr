import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { WebpayController } from './webpay.controller';
import { CreateTransactionUseCase } from '../../application/use-cases/create-transaction.usecase';
import { CommitTransactionUseCase } from '../../application/use-cases/commit-transaction.usecase';
import { RefundTransactionUseCase } from '../../application/use-cases/refund-transaction.usecase';
import { GetTransactionStatusUseCase } from '../../application/use-cases/get-transaction-status.usecase';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { CreateTransactionDto } from '../../application/dto/create-transaction.dto';
import { RefundTransactionDto } from '../../application/dto/refund-transaction.dto';

describe('WebpayController', () => {
  let controller: WebpayController;
  let createTransactionUseCase: jest.Mocked<CreateTransactionUseCase>;
  let commitTransactionUseCase: jest.Mocked<CommitTransactionUseCase>;
  let refundTransactionUseCase: jest.Mocked<RefundTransactionUseCase>;
  let getTransactionStatusUseCase: jest.Mocked<GetTransactionStatusUseCase>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const createConfigMock = (values: Record<string, unknown>) => ({
    get: jest.fn((key: string) => values[key]),
  });

  const createModule = async (configValues: Record<string, unknown>) => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebpayController],
      providers: [
        {
          provide: CreateTransactionUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: CommitTransactionUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: RefundTransactionUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetTransactionStatusUseCase,
          useValue: { execute: jest.fn(), getFromDB: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: createConfigMock(configValues),
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

    controller = module.get(WebpayController);
    createTransactionUseCase = module.get(CreateTransactionUseCase);
    commitTransactionUseCase = module.get(CommitTransactionUseCase);
    refundTransactionUseCase = module.get(RefundTransactionUseCase);
    getTransactionStatusUseCase = module.get(GetTransactionStatusUseCase);
    traceService = module.get(TraceService);
  };

  beforeEach(async () => {
    await createModule({});
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('constructor', () => {
    it('debe usar URLs por defecto cuando no hay configuración', async () => {
      const res = { redirect: jest.fn() } as unknown as Response;
      commitTransactionUseCase.execute.mockResolvedValue({
        id: 'tx-1',
        amount: 5000,
        status: 'AUTHORIZED',
        buyOrder: 'BO-1',
        sessionId: 'S-1',
      });

      await controller.handleReturn('tok-1', res, tracking);

      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/dashboard/qr/pay/webpay?status=success',
      );
    });

    it('debe usar las URLs configuradas cuando existen', async () => {
      await createModule({
        FRONTEND_BASE_PATH: 'http://front.local',
        WEBPAY_SUCCESS_URL: 'http://custom.local/success',
        WEBPAY_FAIL_URL: 'http://custom.local/fail',
        WEBPAY_ERROR_URL: 'http://custom.local/error',
      });

      const res = { redirect: jest.fn() } as unknown as Response;
      commitTransactionUseCase.execute.mockResolvedValue({
        id: 'tx-1',
        amount: 5000,
        status: 'FAILED',
        buyOrder: 'BO-1',
        sessionId: 'S-1',
      });

      await controller.handleReturn('tok-1', res, tracking);

      expect(res.redirect).toHaveBeenCalledWith('http://custom.local/fail');
    });
  });

  describe('createTransaction', () => {
    it('debe ejecutar el use case con el sessionId del token y retornar el resultado', async () => {
      const dto: CreateTransactionDto = {
        amount: 5000,
        buyOrder: 'BO-1',
        returnUrl: 'https://front.local/return',
      };
      const result = { token: 'tok-1', url: 'https://webpay.local/pay' };
      createTransactionUseCase.execute.mockResolvedValue(result);

      // SPEC-009 A2: el sessionId NO viene del body — se inyecta desde user.id del token
      const response = await controller.createTransaction(dto, { id: 'S-1', role: 'user' }, tracking);

      expect(createTransactionUseCase.execute).toHaveBeenCalledWith(dto, 'S-1', tracking);
      expect(response).toEqual(result);
      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'POST /webpay/create',
        { buyOrder: dto.buyOrder },
      );
    });
  });

  describe('handleReturn', () => {
    it('debe redirigir a la URL de éxito cuando el estado es AUTHORIZED', async () => {
      const res = { redirect: jest.fn() } as unknown as Response;
      commitTransactionUseCase.execute.mockResolvedValue({
        id: 'tx-1',
        amount: 5000,
        status: 'AUTHORIZED',
        buyOrder: 'BO-1',
        sessionId: 'S-1',
      });

      await controller.handleReturn('tok-1', res, tracking);

      expect(commitTransactionUseCase.execute).toHaveBeenCalledWith('tok-1', tracking);
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/dashboard/qr/pay/webpay?status=success',
      );
    });

    it('debe redirigir a la URL de fallo cuando el estado no es AUTHORIZED', async () => {
      const res = { redirect: jest.fn() } as unknown as Response;
      commitTransactionUseCase.execute.mockResolvedValue({
        id: 'tx-1',
        amount: 5000,
        status: 'FAILED',
        buyOrder: 'BO-1',
        sessionId: 'S-1',
      });

      await controller.handleReturn('tok-1', res, tracking);

      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/dashboard/qr/pay/webpay?status=failed',
      );
    });

    it('debe redirigir a la URL de error cuando el use case falla', async () => {
      const res = { redirect: jest.fn() } as unknown as Response;
      commitTransactionUseCase.execute.mockRejectedValue(new Error('Transbank caído'));

      await controller.handleReturn('tok-1', res, tracking);

      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/dashboard/qr/pay/webpay?status=error',
      );
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'GET /webpay/return - error',
        expect.any(Error),
      );
    });
  });

  describe('refundTransaction', () => {
    it('debe ejecutar el reembolso y retornar el resultado', async () => {
      const dto: RefundTransactionDto = { token: 'tok-1', amount: 5000 };
      const result = { type: 'REFUNDED', nullified_amount: 5000 };
      refundTransactionUseCase.execute.mockResolvedValue(result);

      const response = await controller.refundTransaction(dto, tracking);

      expect(refundTransactionUseCase.execute).toHaveBeenCalledWith(dto, tracking);
      expect(response).toEqual(result);
      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'POST /webpay/refund',
        { tokenPreview: 'tok-1…' },
      );
    });
  });

  describe('getTransactionStatus', () => {
    it('debe ejecutar la consulta de estado y retornar el resultado (ownership OK)', async () => {
      const result = {
        id: 'tx-1',
        token: 'tok-1',
        amount: 5000,
        buyOrder: 'BO-1',
        sessionId: 'S-1',
        status: 'AUTHORIZED',
      };
      getTransactionStatusUseCase.execute.mockResolvedValue(result);

      // SPEC-009 A2: actor dueño de la tx (sessionId === user.id)
      const response = await controller.getTransactionStatus(
        'tok-1',
        { id: 'S-1', role: 'user' },
        tracking,
      );

      expect(getTransactionStatusUseCase.execute).toHaveBeenCalledWith('tok-1', tracking);
      expect(response).toEqual(result);
    });

    it('SPEC-009 A2: 403 si la tx es de otro usuario (no admin)', async () => {
      const result = {
        id: 'tx-1',
        token: 'tok-1',
        amount: 5000,
        buyOrder: 'BO-1',
        sessionId: 'S-1',
        status: 'AUTHORIZED',
      };
      getTransactionStatusUseCase.execute.mockResolvedValue(result);

      await expect(
        controller.getTransactionStatus('tok-1', { id: 'OTRO-USER', role: 'user' }, tracking),
      ).rejects.toThrow('No tiene permiso para consultar esta transacción.');
    });

    it('SPEC-009 A2: 404 si la tx no existe o no tiene sessionId', async () => {
      getTransactionStatusUseCase.execute.mockResolvedValue(null);

      await expect(
        controller.getTransactionStatus('tok-x', { id: 'S-1', role: 'user' }, tracking),
      ).rejects.toThrow('Transacción no encontrada');
    });
  });

  describe('getTransaction', () => {
    it('debe retornar la transacción desde la BD (ownership OK)', async () => {
      const result = {
        id: 'tx-1',
        token: 'tok-1',
        amount: 5000,
        buyOrder: 'BO-1',
        sessionId: 'S-1',
        status: 'AUTHORIZED',
      };
      getTransactionStatusUseCase.getFromDB.mockResolvedValue(result);

      const response = await controller.getTransaction(
        'tok-1',
        { id: 'S-1', role: 'user' },
        tracking,
      );

      expect(getTransactionStatusUseCase.getFromDB).toHaveBeenCalledWith('tok-1', tracking);
      expect(response).toEqual(result);
    });

    it('SPEC-009 A2: 403 si la tx es de otro usuario', async () => {
      const result = {
        id: 'tx-1',
        token: 'tok-1',
        amount: 5000,
        buyOrder: 'BO-1',
        sessionId: 'S-1',
        status: 'AUTHORIZED',
      };
      getTransactionStatusUseCase.getFromDB.mockResolvedValue(result);

      await expect(
        controller.getTransaction('tok-1', { id: 'OTRO-USER', role: 'user' }, tracking),
      ).rejects.toThrow('No tiene permiso para consultar esta transacción.');
    });

    it('SPEC-009 A2: 404 si no hay transacción en BD', async () => {
      getTransactionStatusUseCase.getFromDB.mockResolvedValue(null);

      await expect(
        controller.getTransaction('tok-x', { id: 'S-1', role: 'user' }, tracking),
      ).rejects.toThrow('Transacción no encontrada');
    });
  });
});