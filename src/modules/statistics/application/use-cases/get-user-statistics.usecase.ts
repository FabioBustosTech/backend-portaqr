import { Injectable, Inject } from '@nestjs/common';
import type { ICanGetStatistics } from '../../domain/ports/queries/statistics.port';
import type { UserStatistics } from '../../domain/entities/statistics.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { STATISTICS_GET_PORT } from '../../domain/constants/statistics.tokens';

@Injectable()
export class GetUserStatisticsUseCase {
  constructor(
    @Inject(STATISTICS_GET_PORT)
    private readonly reader: ICanGetStatistics,
    private readonly traceService: TraceService,
  ) {}

  async execute(userId: string, tracking: TrackingContext): Promise<UserStatistics> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'GetUserStatisticsUseCase - input', {
      userId,
    });
    return this.reader.getUserStatistics(userId, tracking);
  }
}
