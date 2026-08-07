import { Injectable, Inject } from '@nestjs/common';
import type { ICanGetAllUser } from '../../domain/ports/queries/get-user.port';
import type { User } from '../../domain/entities/user.entity';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { USER_GET_ALL_PORT } from '../../domain/constants/user.tokens';
import type { PaginatedResult } from '../../../../common/dto/pagination.dto';

@Injectable()
export class GetAllUserUseCase {
  constructor(
    @Inject(USER_GET_ALL_PORT)
    private readonly reader: ICanGetAllUser,
    private readonly traceService: TraceService,
  ) {}

  async execute(
    page: number,
    limit: number,
    search: string | undefined,
    tracking: TrackingContext,
  ): Promise<PaginatedResult<User>> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'GetAllUserUseCase', { page, limit, search });
    return this.reader.getAll(page, limit, search, tracking);
  }
}
