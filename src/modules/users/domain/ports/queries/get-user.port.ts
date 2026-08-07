import type { User } from '../../entities/user.entity';
import type { PaginatedResult } from '../../../../../common/dto/pagination.dto';
import type { TrackingContext } from '../../../../../common/decorators/tracking.decorator';

export interface ICanGetAllUser {
  getAll(
    page: number,
    limit: number,
    search: string | undefined,
    tracking: TrackingContext,
  ): Promise<PaginatedResult<User>>;
}

export interface ICanGetUser {
  getById(id: string, tracking: TrackingContext): Promise<User | null>;
  getByEmail(email: string, tracking: TrackingContext): Promise<User | null>;
  getByUsername(
    usernameOrEmail: string,
    tracking: TrackingContext,
  ): Promise<User | null>;
  getByVerificationCode(
    code: string,
    tracking: TrackingContext,
  ): Promise<User | null>;
  getByPasswordResetCode(
    code: string,
    tracking: TrackingContext,
  ): Promise<User | null>;
}
