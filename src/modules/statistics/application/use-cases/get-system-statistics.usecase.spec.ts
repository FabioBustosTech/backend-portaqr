import { Test, TestingModule } from '@nestjs/testing';
import { GetSystemStatisticsUseCase } from './get-system-statistics.usecase';
import { STATISTICS_GET_PORT } from '../../domain/constants/statistics.tokens';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import type { SystemStatistics } from '../../domain/entities/statistics.entity';
import type { ICanGetStatistics } from '../../domain/ports/queries/statistics.port';

describe('GetSystemStatisticsUseCase', () => {
  let useCase: GetSystemStatisticsUseCase;
  let reader: jest.Mocked<ICanGetStatistics>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const mockSystemStatistics: SystemStatistics = {
    scans: { total: 1000, monthly: 250, daily: 30 },
    qrs: { total: 200, active: 180 },
    users: { total: 50, active: 35 },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetSystemStatisticsUseCase,
        {
          provide: STATISTICS_GET_PORT,
          useValue: {
            getUserStatistics: jest.fn(),
            getSystemStatistics: jest.fn(),
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

    useCase = module.get(GetSystemStatisticsUseCase);
    reader = module.get(STATISTICS_GET_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe retornar las estadísticas del sistema delegando en el puerto', async () => {
      reader.getSystemStatistics.mockResolvedValue(mockSystemStatistics);

      const result = await useCase.execute(tracking);

      expect(reader.getSystemStatistics).toHaveBeenCalledWith(tracking);
      expect(result).toEqual(mockSystemStatistics);
    });

    it('debe registrar la traza de entrada', async () => {
      reader.getSystemStatistics.mockResolvedValue(mockSystemStatistics);

      await useCase.execute(tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'GetSystemStatisticsUseCase - input',
        expect.any(Object),
      );
    });

    it('debe propagar errores del puerto', async () => {
      const error = new Error('DB down');
      reader.getSystemStatistics.mockRejectedValue(error);

      await expect(useCase.execute(tracking)).rejects.toThrow('DB down');
    });
  });
});
