import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ICanUpdateUser } from '../../domain/ports/queries/create-user.port';
import type { User } from '../../domain/entities/user.entity';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { USER_UPDATE_PORT } from '../../domain/constants/user.tokens';

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_UPDATE_PORT)
    private readonly updater: ICanUpdateUser,
    private readonly traceService: TraceService,
  ) {}

  async execute(
    id: string,
    data: Partial<User>,
    tracking: TrackingContext,
  ): Promise<User> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'UpdateUserUseCase', { id });
    const updated = await this.updater.update(id, data, tracking);
    if (!updated) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return updated;
  }

  async updateLastLogin(userId: string, tracking: TrackingContext): Promise<void> {
    return this.updater.updateLastLogin(userId, tracking);
  }
}
