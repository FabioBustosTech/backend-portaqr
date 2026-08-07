import { Test, TestingModule } from '@nestjs/testing';
import { GetUserStatisticsUseCase } from './get-user-statistics.usecase';
import { STATISTICS_GET_PORT } from '../../domain/constants/statistics.tokens';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import type { UserStatistics } from '../../domain/entities/statistics.entity';
import type { ICanGetStatistics } from '../../domain/ports/queries/statistics.port';

describe('GetUserStatisticsUseCase', () => {
  let useCase: GetUserStatisticsUseCase;
  let reader: jest.Mocked<ICanGetStatistics>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const mockUserStatistics: UserStatistics = {
    scans: { total: 120, monthly: 40, daily: 5 },
    qrs: { total: 12, active: 10 },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUserStatisticsUseCase,
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

    useCase = module.get(GetUserStatisticsUseCase);
    reader = module.get(STATISTICS_GET_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe retornar las estadísticas del usuario delegando en el puerto', async () => {
      reader.getUserStatistics.mockResolvedValue(mockUserStatistics);

      const result = await useCase.execute('user-1', tracking);

      expect(reader.getUserStatistics).toHaveBeenCalledWith('user-1', tracking);
      expect(result).toEqual(mockUserStatistics);
    });

    it('debe registrar la traza de entrada con el userId', async () => {
      reader.getUserStatistics.mockResolvedValue(mockUserStatistics);

      await useCase.execute('user-1', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'GetUserStatisticsUseCase - input',
        expect.objectContaining({ userId: 'user-1' }),
      );
    });

    it('debe propagar errores del puerto', async () => {
      const error = new Error('DB down');
      reader.getUserStatistics.mockRejectedValue(error);

      await expect(useCase.execute('user-1', tracking)).rejects.toThrow('DB down');
    });
  });
});
