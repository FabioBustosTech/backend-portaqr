import type { User } from '../../entities/user.entity';
import type { TrackingContext } from '../../../../../common/decorators/tracking.decorator';

export interface ICanCreateUser {
  create(user: User, tracking: TrackingContext): Promise<User>;
  createAdmin(user: User, tracking: TrackingContext): Promise<User>;
}

export interface ICanUpdateUser {
  update(
    id: string,
    data: Partial<User>,
    tracking: TrackingContext,
  ): Promise<User | null>;
  updateLastLogin(userId: string, tracking: TrackingContext): Promise<void>;
  /** Incrementa tokenVersion del usuario (invalida todos sus tokens JWT emitidos) */
  incrementTokenVersion(userId: string, tracking: TrackingContext): Promise<void>;
}

export interface ICanDeleteUser {
  delete(id: string, tracking: TrackingContext): Promise<boolean>;
}

export interface ICanCheckUser {
  checkUserNameExists(userName: string, tracking: TrackingContext): Promise<boolean>;
  checkEmailExists(email: string, tracking: TrackingContext): Promise<boolean>;
}
