import { Test, TestingModule } from '@nestjs/testing';
import { GetScanStatsUseCase } from './get-scan-stats.usecase';
import { SCAN_GET_PORT } from '../../domain/constants/scan.tokens';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import type { ICanGetScan } from '../../domain/ports/queries/scan.port';

describe('GetScanStatsUseCase', () => {
  let useCase: GetScanStatsUseCase;
  let reader: jest.Mocked<ICanGetScan>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const mockStats = {
    total: 100,
    successful: 90,
    failed: 10,
    uniqueUsers: 25,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetScanStatsUseCase,
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

    useCase = module.get(GetScanStatsUseCase);
    reader = module.get(SCAN_GET_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe retornar las estadísticas del QR delegando en el puerto', async () => {
      reader.getStatsByQrId.mockResolvedValue(mockStats);

      const result = await useCase.execute('qr-1', tracking);

      expect(reader.getStatsByQrId).toHaveBeenCalledWith('qr-1', tracking);
      expect(result).toEqual(mockStats);
    });

    it('debe retornar null cuando no existen estadísticas para el QR', async () => {
      reader.getStatsByQrId.mockResolvedValue(null);

      const result = await useCase.execute('qr-inexistente', tracking);

      expect(reader.getStatsByQrId).toHaveBeenCalledWith('qr-inexistente', tracking);
      expect(result).toBeNull();
    });

    it('debe registrar la traza de entrada con el idQr', async () => {
      reader.getStatsByQrId.mockResolvedValue(mockStats);

      await useCase.execute('qr-1', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'GetScanStatsUseCase - input',
        expect.objectContaining({ idQr: 'qr-1' }),
      );
    });

    it('debe propagar errores del puerto', async () => {
      const error = new Error('DB down');
      reader.getStatsByQrId.mockRejectedValue(error);

      await expect(useCase.execute('qr-1', tracking)).rejects.toThrow('DB down');
    });
  });
});
