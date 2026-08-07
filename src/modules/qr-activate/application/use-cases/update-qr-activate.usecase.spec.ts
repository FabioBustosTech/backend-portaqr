import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UpdateQrActivateUseCase } from './update-qr-activate.usecase';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { QR_ACTIVATE_UPDATE_PORT } from '../../domain/constants/qr-activate.tokens';
import type { ICanUpdateQrActivate } from '../../domain/ports/queries/qr-activate.port';
import {
  MethodActivation,
  ActivationState,
  DocumentType,
} from '../../domain/entities/qr-activate.entity';
import type { QrActivate } from '../../domain/entities/qr-activate.entity';
import { UpdateQrActivateDto } from '../dto/update-qr-activate.dto';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';

describe('UpdateQrActivateUseCase', () => {
  let useCase: UpdateQrActivateUseCase;
  let updater: jest.Mocked<ICanUpdateQrActivate>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const mockActivation: QrActivate = {
    id: 'act-1',
    methodActivation: MethodActivation.WEBPAY,
    state: ActivationState.ACTIVE,
    price: { TotalPrice: 100, TotalTax: 19 },
    userId: 'user-1',
    qrList: [],
    documentType: DocumentType.BOLETA,
  };

  const dto: UpdateQrActivateDto = {
    description: 'Activación actualizada',
    sendDocument: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateQrActivateUseCase,
        {
          provide: QR_ACTIVATE_UPDATE_PORT,
          useValue: {
            update: jest.fn(),
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

    useCase = module.get<UpdateQrActivateUseCase>(UpdateQrActivateUseCase);
    updater = module.get(QR_ACTIVATE_UPDATE_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe actualizar la activación y retornar el resultado', async () => {
      updater.update.mockResolvedValue(mockActivation);

      const result = await useCase.execute('act-1', dto, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'UpdateQrActivateUseCase',
        { id: 'act-1' },
      );
      expect(updater.update).toHaveBeenCalledWith('act-1', dto, tracking);
      expect(result).toEqual(mockActivation);
    });

    it('debe lanzar NotFoundException si la activación no existe', async () => {
      updater.update.mockResolvedValue(null);

      await expect(useCase.execute('act-1', dto, tracking)).rejects.toThrow(
        NotFoundException,
      );
      await expect(useCase.execute('act-1', dto, tracking)).rejects.toThrow(
        'Activación con ID act-1 no encontrada',
      );
    });

    it('debe propagar el error si el puerto de actualización falla', async () => {
      updater.update.mockRejectedValue(new Error('DB down'));

      await expect(useCase.execute('act-1', dto, tracking)).rejects.toThrow(
        'DB down',
      );
    });
  });
});