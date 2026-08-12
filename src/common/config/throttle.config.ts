/**
 * Reglas de rate limiting por endpoint sensible (SPEC-008 H4 — R4, CA-06).
 * Login/refresh/registro/contacto son bruteforceables: 5 req/min por defecto.
 * Configurables por env (THROTTLE_SENSITIVE_LIMIT/TTL) — en dev/CI se sube el
 * límite para no bloquear la suite E2E (todos los tests comparten la IP).
 * Se usa con `@Throttle(SENSITIVE_ENDPOINT_THROTTLE)`.
 */
function sensitiveThrottle() {
  const limit = Number(process.env.THROTTLE_SENSITIVE_LIMIT);
  const ttl = Number(process.env.THROTTLE_SENSITIVE_TTL);
  return {
    default: {
      limit: Number.isFinite(limit) && limit > 0 ? limit : 5,
      ttl: Number.isFinite(ttl) && ttl > 0 ? ttl : 60_000,
    },
  };
}

export const SENSITIVE_ENDPOINT_THROTTLE = sensitiveThrottle();
