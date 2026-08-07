import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DeleteQrUseCase } from './delete-qr.usecase';
import type { ICanDeleteQr } from '../../domain/ports/queries/qr.port';
import { QR_DELETE_PORT } from '../../domain/constants/qr.tokens';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';

describe('DeleteQrUseCase', () => {
  let useCase: DeleteQrUseCase;
  let deleter: jest.Mocked<ICanDeleteQr>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };
  const id = 'qr-id-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteQrUseCase,
        {
          provide: QR_DELETE_PORT,
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

    useCase = module.get(DeleteQrUseCase);
    deleter = module.get(QR_DELETE_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe eliminar el QR a través del port cuando existe', async () => {
      deleter.delete.mockResolvedValue(true);

      await expect(useCase.execute(id, tracking)).resolves.toBeUndefined();

      expect(deleter.delete).toHaveBeenCalledWith(id, tracking);
    });

    it('debe lanzar NotFoundException si el port retorna false', async () => {
      deleter.delete.mockResolvedValue(false);

      await expect(useCase.execute(id, tracking)).rejects.toThrow(
        NotFoundException,
      );
      expect(traceService.warn).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'DeleteQrUseCase - not found',
        { id },
      );
    });

    it('debe registrar el input en el TraceService', async () => {
      deleter.delete.mockResolvedValue(true);

      await useCase.execute(id, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'DeleteQrUseCase - input',
        { id },
      );
    });

    it('debe propagar errores del port', async () => {
      deleter.delete.mockRejectedValue(new Error('DB down'));

      await expect(useCase.execute(id, tracking)).rejects.toThrow('DB down');
    });
  });
});
