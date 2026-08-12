/**
 * Reglas de rate limiting por endpoint sensible (SPEC-008 H4 — R4, CA-06).
 * Login/refresh/registro/contacto son bruteforceables: 5 req/min.
 * Se usa con `@Throttle(SENSITIVE_ENDPOINT_THROTTLE)`.
 */
export const SENSITIVE_ENDPOINT_THROTTLE = {
  default: { limit: 5, ttl: 60_000 },
} as const;
