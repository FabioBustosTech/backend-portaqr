import { Test, TestingModule } from '@nestjs/testing';
import { GetOriginScanStatsUseCase } from './get-origin-scan-stats.usecase';
import { SCAN_GET_PORT } from '../../domain/constants/scan.tokens';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import type { ICanGetScan } from '../../domain/ports/queries/scan.port';

describe('GetOriginScanStatsUseCase', () => {
  let useCase: GetOriginScanStatsUseCase;
  let reader: jest.Mocked<ICanGetScan>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const mockOriginStats = [
    { origen: 'web', count: 80 },
    { origen: 'app', count: 20 },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetOriginScanStatsUseCase,
        {
          provide: SCAN_GET_PORT,
          useValue: {
            getStatsByQrId: jest.fn(),
            getDailyStats: jest.fn(),
            getDeviceStats: jest.fn(),
            getOriginStats: jest.fn(),
            getLocationStats: jest.fn(),
            getRecentScans: jest.fn(),
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

    useCase = module.get(GetOriginScanStatsUseCase);
    reader = module.get(SCAN_GET_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe retornar las estadísticas de origen delegando en el puerto', async () => {
      reader.getOriginStats.mockResolvedValue(mockOriginStats);

      const result = await useCase.execute('qr-1', tracking);

      expect(reader.getOriginStats).toHaveBeenCalledWith('qr-1', tracking);
      expect(result).toEqual(mockOriginStats);
    });

    it('debe retornar null cuando no hay estadísticas de origen', async () => {
      reader.getOriginStats.mockResolvedValue(null);

      const result = await useCase.execute('qr-1', tracking);

      expect(result).toBeNull();
    });

    it('debe registrar la traza de entrada con el idQr', async () => {
      reader.getOriginStats.mockResolvedValue([]);

      await useCase.execute('qr-1', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'GetOriginScanStatsUseCase - input',
        expect.objectContaining({ idQr: 'qr-1' }),
      );
    });

    it('debe propagar errores del puerto', async () => {
      const error = new Error('DB down');
      reader.getOriginStats.mockRejectedValue(error);

      await expect(useCase.execute('qr-1', tracking)).rejects.toThrow('DB down');
    });
  });
});
