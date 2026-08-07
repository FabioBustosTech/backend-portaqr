import { Injectable } from '@nestjs/common';
import type { UserStatistics, SystemStatistics } from '../../domain/entities/statistics.entity';
import type { ICanGetStatistics } from '../../domain/ports/queries/statistics.port';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { MongoStatisticsRepository } from '../repository/mongo/mongo-statistics.repository';

@Injectable()
export class StatisticsRepositoryAdapter implements ICanGetStatistics {
  constructor(private readonly mongoRepository: MongoStatisticsRepository) {}

  async getUserStatistics(userId: string, tracking: TrackingContext): Promise<UserStatistics> {
    return this.mongoRepository.getUserStatistics(userId, tracking);
  }

  async getSystemStatistics(tracking: TrackingContext): Promise<SystemStatistics> {
    return this.mongoRepository.getSystemStatistics(tracking);
  }
}
