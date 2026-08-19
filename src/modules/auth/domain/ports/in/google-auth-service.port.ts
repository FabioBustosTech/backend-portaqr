import type { TrackingContext } from '../../../../../common/decorators/tracking.decorator';
import type { AuthResponse } from './auth-service.port';

/** SPEC-020 RF-8: perfil normalizado de Google (extraído por GoogleStrategy) */
export interface GoogleProfile {
  email: string;
  googleId: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
}

/** SPEC-020 RF-8: modo del flujo Google OAuth (origen del botón) */
export type GoogleAuthMode = 'login' | 'signup';

/** SPEC-020 RF-8: puerto de entrada del flujo Google OAuth (patrón IAuthService/AUTH_SERVICE_PORT) */
export interface IGoogleAuthService {
  /**
   * Autentica con el perfil de Google:
   * - email NO existe + mode 'signup' → crea cuenta (provider 'google', isEmailVerified true, password hash aleatorio)
   * - email NO existe + mode 'login' → NO crea (lanza GoogleAccountNotFoundError — el frontend redirige a signup)
   * - email existe → vincula googleId (sin tocar password/role)
   * Retorna { user (sin password), accessToken, refreshToken } — mismo shape que POST /auth/login.
   */
  authenticate(
    profile: GoogleProfile,
    mode: GoogleAuthMode,
    tracking: TrackingContext,
  ): Promise<AuthResponse>;
}