import { Test, TestingModule } from '@nestjs/testing';
import { ActivateManyQrsUseCase } from './activate-many-qrs.usecase';
import type { ICanUpdateQr } from '../../domain/ports/queries/qr.port';
import { QR_UPDATE_PORT } from '../../domain/constants/qr.tokens';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';

describe('ActivateManyQrsUseCase', () => {
  let useCase: ActivateManyQrsUseCase;
  let updater: jest.Mocked<ICanUpdateQr>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivateManyQrsUseCase,
        {
          provide: QR_UPDATE_PORT,
          useValue: {
            activateMany: jest.fn(),
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

    useCase = module.get(ActivateManyQrsUseCase);
    updater = module.get(QR_UPDATE_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe activar los QRs a través del port y retornar matchedCount/modifiedCount', async () => {
      updater.activateMany.mockResolvedValue({ matchedCount: 3, modifiedCount: 3 });

      const codes = ['qr-1', 'qr-2', 'qr-3'];
      const expiration = new Date('2026-08-11T00:00:00.000Z');
      const result = await useCase.execute(codes, expiration, tracking);

      expect(updater.activateMany).toHaveBeenCalledWith(codes, expiration, tracking);
      expect(result).toEqual({ matchedCount: 3, modifiedCount: 3 });
      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'ActivateManyQrsUseCase - input',
        { total: 3 },
      );
      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'ActivateManyQrsUseCase - complete',
        { total: 3, matchedCount: 3, modifiedCount: 3 },
      );
    });

    it('debe propagar matchedCount menor cuando hay QRs inexistentes (no fatal)', async () => {
      updater.activateMany.mockResolvedValue({ matchedCount: 2, modifiedCount: 2 });

      const result = await useCase.execute(
        ['qr-1', 'qr-2', 'qr-inexistente'],
        new Date(),
        tracking,
      );

      expect(result).toEqual({ matchedCount: 2, modifiedCount: 2 });
    });

    it('debe propagar modifiedCount menor en re-procesos idempotentes (RF-3)', async () => {
      updater.activateMany.mockResolvedValue({ matchedCount: 3, modifiedCount: 0 });

      const result = await useCase.execute(
        ['qr-1', 'qr-2', 'qr-3'],
        new Date(),
        tracking,
      );

      expect(result).toEqual({ matchedCount: 3, modifiedCount: 0 });
    });

    it('debe propagar errores del port', async () => {
      updater.activateMany.mockRejectedValue(new Error('DB down'));

      await expect(useCase.execute(['qr-1'], new Date(), tracking)).rejects.toThrow(
        'DB down',
      );
    });
  });
});
