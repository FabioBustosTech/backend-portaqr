import { randomBytes } from 'crypto';

/**
 * SPEC-009 A5: genera un código de verificación con CSPRNG.
 *
 * `crypto.randomBytes(5).toString('hex')` → 10 chars hex ≈ 40 bits de entropía
 * (vs. el antiguo `Math.random().toString(36).substring(2, 8)` — NO criptográfico
 * y predecible). Usado en create-user, forgot-password y resend-verification.
 */
export function generateVerificationCode(): string {
  return randomBytes(5).toString('hex').toUpperCase();
}

/** Máximo de intentos fallidos antes de invalidar el código (SPEC-009 A5). */
export const VERIFICATION_MAX_ATTEMPTS = 5;
