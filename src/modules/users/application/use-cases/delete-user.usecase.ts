import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ICanDeleteUser } from '../../domain/ports/queries/create-user.port';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { USER_DELETE_PORT } from '../../domain/constants/user.tokens';

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject(USER_DELETE_PORT)
    private readonly deleter: ICanDeleteUser,
    private readonly traceService: TraceService,
  ) {}

  async execute(id: string, tracking: TrackingContext): Promise<void> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'DeleteUserUseCase', { id });
    const deleted = await this.deleter.delete(id, tracking);
    if (!deleted) {
      throw new NotFoundException('Usuario no encontrado');
    }
  }
}
