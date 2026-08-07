import { Test, TestingModule } from '@nestjs/testing';
import { GetDailyScanStatsUseCase } from './get-daily-scan-stats.usecase';
import { SCAN_GET_PORT } from '../../domain/constants/scan.tokens';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import type { ICanGetScan } from '../../domain/ports/queries/scan.port';

describe('GetDailyScanStatsUseCase', () => {
  let useCase: GetDailyScanStatsUseCase;
  let reader: jest.Mocked<ICanGetScan>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const mockDailyStats = [
    { date: '2024-01-01', total: 10 },
    { date: '2024-01-02', total: 15 },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetDailyScanStatsUseCase,
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

    useCase = module.get(GetDailyScanStatsUseCase);
    reader = module.get(SCAN_GET_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe retornar las estadísticas diarias delegando en el puerto con idQr, days y tracking', async () => {
      reader.getDailyStats.mockResolvedValue(mockDailyStats);

      const result = await useCase.execute('qr-1', 7, tracking);

      expect(reader.getDailyStats).toHaveBeenCalledWith('qr-1', 7, tracking);
      expect(result).toEqual(mockDailyStats);
    });

    it('debe retornar una lista vacía cuando no hay escaneos en el período', async () => {
      reader.getDailyStats.mockResolvedValue([]);

      const result = await useCase.execute('qr-1', 30, tracking);

      expect(result).toEqual([]);
    });

    it('debe registrar la traza de entrada con idQr y days', async () => {
      reader.getDailyStats.mockResolvedValue([]);

      await useCase.execute('qr-1', 30, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'GetDailyScanStatsUseCase - input',
        expect.objectContaining({ idQr: 'qr-1', days: 30 }),
      );
    });

    it('debe propagar errores del puerto', async () => {
      const error = new Error('DB down');
      reader.getDailyStats.mockRejectedValue(error);

      await expect(useCase.execute('qr-1', 7, tracking)).rejects.toThrow('DB down');
    });
  });
});
