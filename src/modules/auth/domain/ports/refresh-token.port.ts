import type { RefreshToken } from '../entities/refresh-token.entity';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';

/**
 * SPEC-009 A8: almacén de refresh tokens persistido (colección refresh_tokens).
 * El token JWT nunca se guarda plano — solo su hash SHA-256.
 */
export interface IRefreshTokenStore {
  create(
    data: Pick<RefreshToken, 'userId' | 'tokenHash' | 'expiresAt'>,
    tracking: TrackingContext,
  ): Promise<RefreshToken>;
  findByHash(tokenHash: string, tracking: TrackingContext): Promise<RefreshToken | null>;
  /** Revoca un token concreto (rotación) */
  revokeByHash(tokenHash: string, tracking: TrackingContext): Promise<void>;
  /** Revoca todos los refresh activos de un usuario (logout / detección de reuso) */
  revokeAllByUser(userId: string, tracking: TrackingContext): Promise<void>;
}
