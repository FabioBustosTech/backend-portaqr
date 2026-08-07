import type { UserStatistics, SystemStatistics } from '../../entities/statistics.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';

export interface ICanGetStatistics {
  getUserStatistics(userId: string, tracking: TrackingContext): Promise<UserStatistics>;
  getSystemStatistics(tracking: TrackingContext): Promise<SystemStatistics>;
}
