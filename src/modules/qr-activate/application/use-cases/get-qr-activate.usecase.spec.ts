import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetQrActivateUseCase } from './get-qr-activate.usecase';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { QR_ACTIVATE_GET_PORT } from '../../domain/constants/qr-activate.tokens';
import type { ICanGetQrActivate } from '../../domain/ports/queries/qr-activate.port';
import {
  MethodActivation,
  ActivationState,
  DocumentType,
  WebpayState,
} from '../../domain/entities/qr-activate.entity';
import type { QrActivate } from '../../domain/entities/qr-activate.entity';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';

describe('GetQrActivateUseCase', () => {
  let useCase: GetQrActivateUseCase;
  let reader: jest.Mocked<ICanGetQrActivate>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const mockActivation: QrActivate = {
    id: 'act-1',
    methodActivation: MethodActivation.WEBPAY,
    state: ActivationState.PENDING,
    price: { TotalPrice: 100, TotalTax: 19 },
    userId: 'user-1',
    qrList: [],
    documentType: DocumentType.BOLETA,
    WebpayTransaction: { id: 'tx-1', state: WebpayState.PENDING },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetQrActivateUseCase,
        {
          provide: QR_ACTIVATE_GET_PORT,
          useValue: {
            getAll: jest.fn(),
            getById: jest.fn(),
            getByWebpayToken: jest.fn(),
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

    useCase = module.get<GetQrActivateUseCase>(GetQrActivateUseCase);
    reader = module.get(QR_ACTIVATE_GET_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe retornar la activación cuando existe', async () => {
      reader.getById.mockResolvedValue(mockActivation);

      const result = await useCase.execute('act-1', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'GetQrActivateUseCase',
        { id: 'act-1' },
      );
      expect(reader.getById).toHaveBeenCalledWith('act-1', tracking);
      expect(result).toEqual(mockActivation);
    });

    it('debe lanzar NotFoundException si la activación no existe', async () => {
      reader.getById.mockResolvedValue(null);

      await expect(useCase.execute('act-1', tracking)).rejects.toThrow(
        NotFoundException,
      );
      await expect(useCase.execute('act-1', tracking)).rejects.toThrow(
        'Activación con ID act-1 no encontrada',
      );
    });

    it('debe propagar el error si el puerto de lectura falla', async () => {
      reader.getById.mockRejectedValue(new Error('DB down'));

      await expect(useCase.execute('act-1', tracking)).rejects.toThrow('DB down');
    });
  });

  describe('executeByWebpayToken', () => {
    it('debe retornar la activación asociada al token', async () => {
      reader.getByWebpayToken.mockResolvedValue(mockActivation);

      const result = await useCase.executeByWebpayToken('token-ws-1', tracking);

      expect(reader.getByWebpayToken).toHaveBeenCalledWith('token-ws-1', tracking);
      expect(result).toEqual(mockActivation);
    });

    it('debe retornar null si no existe activación para el token', async () => {
      reader.getByWebpayToken.mockResolvedValue(null);

      const result = await useCase.executeByWebpayToken('token-ws-1', tracking);

      expect(result).toBeNull();
    });
  });
});