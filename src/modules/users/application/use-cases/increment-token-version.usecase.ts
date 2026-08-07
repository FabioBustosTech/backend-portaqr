import { Injectable, Inject } from '@nestjs/common';
import type { ICanUpdateUser } from '../../domain/ports/queries/create-user.port';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { USER_UPDATE_PORT } from '../../domain/constants/user.tokens';

@Injectable()
export class IncrementTokenVersionUseCase {
  constructor(
    @Inject(USER_UPDATE_PORT)
    private readonly updater: ICanUpdateUser,
    private readonly traceService: TraceService,
  ) {}

  async execute(userId: string, tracking: TrackingContext): Promise<void> {
    this.traceService.log(
      tracking,
      TraceLayer.USE_CASE,
      'IncrementTokenVersionUseCase',
      { userId },
    );
    await this.updater.incrementTokenVersion(userId, tracking);
  }
}
