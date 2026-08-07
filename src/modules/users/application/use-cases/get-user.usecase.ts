import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ICanGetUser } from '../../domain/ports/queries/get-user.port';
import type { User } from '../../domain/entities/user.entity';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { USER_GET_PORT } from '../../domain/constants/user.tokens';

@Injectable()
export class GetUserUseCase {
  constructor(
    @Inject(USER_GET_PORT)
    private readonly reader: ICanGetUser,
    private readonly traceService: TraceService,
  ) {}

  async execute(id: string, tracking: TrackingContext): Promise<User> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'GetUserUseCase', { id });
    const user = await this.reader.getById(id, tracking);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async executeByEmail(email: string, tracking: TrackingContext): Promise<User | null> {
    return this.reader.getByEmail(email, tracking);
  }

  async executeByUsername(usernameOrEmail: string, tracking: TrackingContext): Promise<User | null> {
    return this.reader.getByUsername(usernameOrEmail, tracking);
  }

  async executeByVerificationCode(code: string, tracking: TrackingContext): Promise<User | null> {
    return this.reader.getByVerificationCode(code, tracking);
  }

  async executeByPasswordResetCode(code: string, tracking: TrackingContext): Promise<User | null> {
    return this.reader.getByPasswordResetCode(code, tracking);
  }
}
