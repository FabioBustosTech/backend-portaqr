/**
 * SPEC-009 A13 — sanitización de datos para logs (whitelist default-deny).
 *
 * - `sanitizeForLog(data, allowedFields?)`: recorre objetos/anidados y:
 *   1. Los campos SENSIBLES (`password|token|token_ws|code|pin` y variantes)
 *      SIEMPRE se redactan (nunca salen, aunque estén en la whitelist).
 *   2. Con `allowedFields` → default-deny: solo se conservan esas keys.
 *   3. Sin `allowedFields` → se conserva todo lo no sensible (redacción recursiva).
 */

export const SENSITIVE_LOG_FIELDS = [
  'password',
  'token',
  'token_ws',
  'code',
  'pin',
  'verificationCode',
  'passwordResetCode',
  'refreshToken',
  'accessToken',
] as const;

const REDACTED = '[REDACTED]';

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_LOG_FIELDS.some((f) => lower.includes(f));
}

export function sanitizeForLog(
  data: unknown,
  allowedFields?: string[],
  redactedValue: string = REDACTED,
): unknown {
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForLog(item, allowedFields, redactedValue));
  }

  if (data && typeof data === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (isSensitiveKey(key)) {
        // Default-deny: con whitelist, un campo sensible FUERA de ella se omite
        // (nunca sale, ni redactado). Con whitelist que lo incluye (o sin whitelist)
        // se muestra redactado.
        if (allowedFields && !allowedFields.includes(key)) {
          continue;
        }
        out[key] = redactedValue;
        continue;
      }
      if (allowedFields && !allowedFields.includes(key)) {
        continue; // default-deny: la key no está en la whitelist → se omite
      }
      if (value && typeof value === 'object') {
        out[key] = sanitizeForLog(value, allowedFields, redactedValue);
      } else {
        out[key] = value;
      }
    }
    return out;
  }

  return data;
}
