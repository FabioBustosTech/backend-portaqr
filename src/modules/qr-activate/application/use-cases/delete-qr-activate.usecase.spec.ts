import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DeleteQrActivateUseCase } from './delete-qr-activate.usecase';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { QR_ACTIVATE_DELETE_PORT } from '../../domain/constants/qr-activate.tokens';
import type { ICanDeleteQrActivate } from '../../domain/ports/queries/qr-activate.port';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';

describe('DeleteQrActivateUseCase', () => {
  let useCase: DeleteQrActivateUseCase;
  let deleter: jest.Mocked<ICanDeleteQrActivate>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteQrActivateUseCase,
        {
          provide: QR_ACTIVATE_DELETE_PORT,
          useValue: {
            delete: jest.fn(),
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

    useCase = module.get<DeleteQrActivateUseCase>(DeleteQrActivateUseCase);
    deleter = module.get(QR_ACTIVATE_DELETE_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe eliminar la activación cuando existe', async () => {
      deleter.delete.mockResolvedValue(true);

      await useCase.execute('act-1', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'DeleteQrActivateUseCase',
        { id: 'act-1' },
      );
      expect(deleter.delete).toHaveBeenCalledWith('act-1', tracking);
    });

    it('debe lanzar NotFoundException si la activación no existe', async () => {
      deleter.delete.mockResolvedValue(false);

      await expect(useCase.execute('act-1', tracking)).rejects.toThrow(
        NotFoundException,
      );
      await expect(useCase.execute('act-1', tracking)).rejects.toThrow(
        'Activación con ID act-1 no encontrada',
      );
    });

    it('debe propagar el error si el puerto de eliminación falla', async () => {
      deleter.delete.mockRejectedValue(new Error('DB down'));

      await expect(useCase.execute('act-1', tracking)).rejects.toThrow('DB down');
    });
  });
});