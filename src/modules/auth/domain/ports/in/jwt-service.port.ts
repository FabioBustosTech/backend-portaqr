import type { User } from '../../../../users/domain/entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  userName: string;
  role: string;
  isEmailVerified: boolean;
  /** Versión del token del usuario; se incrementa al hacer logout para invalidar tokens */
  tokenVersion?: number;
}

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface IJwtService {
  generateTokens(user: User): Promise<AuthTokenResponse>;
  verifyToken(token: string): JwtPayload;
  decodeToken(token: string): JwtPayload | null;
}
