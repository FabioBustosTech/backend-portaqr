import type { TrackingContext } from '../../../../../common/decorators/tracking.decorator';
import type { AuthTokenResponse, JwtPayload } from './jwt-service.port';
import type { User } from '../../../../users/domain/entities/user.entity';

export interface LoginDto {
  username: string;
  password: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface AuthResponse extends AuthTokenResponse {
  user: Omit<User, 'password'>;
}

export interface IAuthService {
  login(dto: LoginDto, tracking: TrackingContext): Promise<AuthResponse>;
  refreshToken(
    refreshToken: string,
    tracking: TrackingContext,
  ): Promise<AuthTokenResponse>;
  getProfile(userId: string, tracking: TrackingContext): Promise<Omit<User, 'password'>>;
  validateUser(payload: JwtPayload): Promise<User | null>;
}
