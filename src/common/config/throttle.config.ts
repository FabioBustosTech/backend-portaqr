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

/**
 * Reglas de rate limiting del flujo público de QR (SPEC-011 Capa B).
 * Clave por idQr (NO por IP: el BFF solo ve la IP interna de qr-app por la
 * red privada de Railway — un bucket por IP interna limitaría a TODOS los
 * visitantes a la vez). Configurables por env (THROTTLE_QR_*) — TTL en ms
 * (throttler v6). Se usan con:
 *   @SkipThrottle({ default: true })
 *   @Throttle(QR_PUBLIC_THROTTLE)  // o QR_SCAN_THROTTLE / QR_SEO_THROTTLE
 *   @UseGuards(QrPublicThrottlerGuard)
 */
function qrThrottle() {
  const ttl = Number(process.env.THROTTLE_QR_TTL_MS);
  const publicMax = Number(process.env.THROTTLE_QR_PUBLIC_IDQR_MAX);
  const scanMax = Number(process.env.THROTTLE_QR_SCAN_IDQR_MAX);
  const seoMax = Number(process.env.THROTTLE_QR_SEO_MAX);
  const ttlMs = Number.isFinite(ttl) && ttl > 0 ? ttl : 60_000;
  return {
    // GET /qr/public/:id — 60 req/min por idQr (QR viral / bot enfocado)
    public: {
      idqr: {
        limit: Number.isFinite(publicMax) && publicMax > 0 ? publicMax : 60,
        ttl: ttlMs,
      },
    },
    // POST /scan/stats — 120 req/min por idQr (anti-inflado de stats)
    scan: {
      idqr: {
        limit: Number.isFinite(scanMax) && scanMax > 0 ? scanMax : 120,
        ttl: ttlMs,
      },
    },
    // GET /qr/seo-idqr — 10 req/min (sin idQr → cae a IP interna; solo crawlers)
    seo: {
      idqr: {
        limit: Number.isFinite(seoMax) && seoMax > 0 ? seoMax : 10,
        ttl: ttlMs,
      },
    },
  };
}

const QR_RULES = qrThrottle();
export const QR_PUBLIC_THROTTLE = QR_RULES.public;
export const QR_SCAN_THROTTLE = QR_RULES.scan;
export const QR_SEO_THROTTLE = QR_RULES.seo;

/**
 * Throttler `idqr` declarado en el MÓDULO (SPEC-011 Capa B).
 *
 * En @nestjs/throttler v6 el guard itera SOLO los throttlers declarados en
 * ThrottlerModule.forRoot(); `@Throttle({ idqr: {...} })` en una ruta SOLO
 * sobreescribe limit/ttl de un throttler ya declarado con ese nombre (no lo
 * crea). Sin esta declaración, las rutas QR públicas quedaban SIN throttler
 * activo (el `default` se skippea con @SkipThrottle).
 *
 * Este throttler sirve además como límite de SOBRECARGA global del BFF:
 * el guard global lo procesa con tracker req.ip (IP interna de qr-app) →
 * todos los visitantes comparten 1000 req/min (no alcanzable por uso legítimo).
 * Las rutas QR públicas sobreescriben el límite por idQr vía @Throttle
 * (QR_PUBLIC/SCAN/SEO_THROTTLE) con el guard de ruta QrPublicThrottlerGuard.
 */
export function qrOverloadThrottler() {
  const limit = Number(process.env.THROTTLE_QR_OVERLOAD_MAX);
  const ttl = Number(process.env.THROTTLE_QR_TTL_MS);
  return {
    name: 'idqr',
    limit: Number.isFinite(limit) && limit > 0 ? limit : 1000,
    ttl: Number.isFinite(ttl) && ttl > 0 ? ttl : 60_000,
  };
}
