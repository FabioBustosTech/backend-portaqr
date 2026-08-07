import { Test, TestingModule } from '@nestjs/testing';
import { GetLocationScanStatsUseCase } from './get-location-scan-stats.usecase';
import { SCAN_GET_PORT } from '../../domain/constants/scan.tokens';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import type { ICanGetScan } from '../../domain/ports/queries/scan.port';

describe('GetLocationScanStatsUseCase', () => {
  let useCase: GetLocationScanStatsUseCase;
  let reader: jest.Mocked<ICanGetScan>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const mockLocationStats = [
    { city: 'Madrid', country: 'España', count: 50 },
    { city: 'Bogotá', country: 'Colombia', count: 30 },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetLocationScanStatsUseCase,
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

    useCase = module.get(GetLocationScanStatsUseCase);
    reader = module.get(SCAN_GET_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe retornar las estadísticas de ubicaciones delegando en el puerto', async () => {
      reader.getLocationStats.mockResolvedValue(mockLocationStats);

      const result = await useCase.execute('qr-1', tracking);

      expect(reader.getLocationStats).toHaveBeenCalledWith('qr-1', tracking);
      expect(result).toEqual(mockLocationStats);
    });

    it('debe retornar una lista vacía cuando no hay datos de ubicaciones', async () => {
      reader.getLocationStats.mockResolvedValue([]);

      const result = await useCase.execute('qr-1', tracking);

      expect(result).toEqual([]);
    });

    it('debe registrar la traza de entrada con el idQr', async () => {
      reader.getLocationStats.mockResolvedValue([]);

      await useCase.execute('qr-1', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'GetLocationScanStatsUseCase - input',
        expect.objectContaining({ idQr: 'qr-1' }),
      );
    });

    it('debe propagar errores del puerto', async () => {
      const error = new Error('DB down');
      reader.getLocationStats.mockRejectedValue(error);

      await expect(useCase.execute('qr-1', tracking)).rejects.toThrow('DB down');
    });
  });
});
