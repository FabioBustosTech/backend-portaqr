import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsRepositoryAdapter } from './StatisticsRepositoryAdapter';
import { MongoStatisticsRepository } from '../repository/mongo/mongo-statistics.repository';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import type { UserStatistics, SystemStatistics } from '../../domain/entities/statistics.entity';

describe('StatisticsRepositoryAdapter', () => {
  let adapter: StatisticsRepositoryAdapter;
  let mongoRepository: jest.Mocked<MongoStatisticsRepository>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const userStatistics: UserStatistics = {
    scans: { total: 10, monthly: 15, daily: 20 },
    qrs: { total: 3, active: 1 },
  };

  const systemStatistics: SystemStatistics = {
    scans: { total: 100, monthly: 50, daily: 5 },
    qrs: { total: 40, active: 15 },
    users: { total: 10, active: 6 },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticsRepositoryAdapter,
        {
          provide: MongoStatisticsRepository,
          useValue: {
            getUserStatistics: jest.fn(),
            getSystemStatistics: jest.fn(),
          },
        },
      ],
    }).compile();

    adapter = module.get(StatisticsRepositoryAdapter);
    mongoRepository = module.get(MongoStatisticsRepository);
  });

  it('debe estar definido', () => {
    expect(adapter).toBeDefined();
  });

  describe('getUserStatistics', () => {
    it('debe delegar las estadísticas del usuario al repositorio mongo', async () => {
      mongoRepository.getUserStatistics.mockResolvedValue(userStatistics);

      const result = await adapter.getUserStatistics('user-1', tracking);

      expect(mongoRepository.getUserStatistics).toHaveBeenCalledWith('user-1', tracking);
      expect(result).toEqual(userStatistics);
    });
  });

  describe('getSystemStatistics', () => {
    it('debe delegar las estadísticas del sistema al repositorio mongo', async () => {
      mongoRepository.getSystemStatistics.mockResolvedValue(systemStatistics);

      const result = await adapter.getSystemStatistics(tracking);

      expect(mongoRepository.getSystemStatistics).toHaveBeenCalledWith(tracking);
      expect(result).toEqual(systemStatistics);
    });
  });
});