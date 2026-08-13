import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

const MAX_IDQR_LENGTH = 64;
const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;
const IPV6_RE = /^[0-9a-f:]+$/i;

function isValidIp(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 45) return false;
  return IPV4_RE.test(value) || IPV6_RE.test(value);
}

/**
 * Guard de rate limiting para las rutas públicas de QR (SPEC-011 Capa B).
 *
 * La clave del throttler `idqr` es el idQr del request (params o body);
 * cuando no hay idQr (ej. GET /qr/seo-idqr), se cae a la IP.
 *
 * Contexto de red (verificado 2026-08-13): el BFF solo recibe tráfico de
 * `qr-app` por la red privada de Railway (`backend-portaqr.railway.internal`)
 * y el route handler de Next NO reenvía `cf-connecting-ip` → la IP real del
 * visitante JAMÁS llega aquí. La protección por IP real del visitante vive en
 * la Capa A (route handler) y la Capa C (Cloudflare WAF) — ver SPEC-011 §4.2.
 *
 * Uso: `@SkipThrottle({ default: true })` (excluye el guard global de SPEC-008)
 * + `@Throttle(QR_*_THROTTLE)` + `@UseGuards(QrPublicThrottlerGuard)`.
 */
@Injectable()
export class QrPublicThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const bodyIdQr: unknown = req.body?.idQr;
    const paramIdQr: unknown = req.params?.idQr ?? req.params?.id;
    const idQr = typeof bodyIdQr === 'string' && bodyIdQr.length > 0 ? bodyIdQr : paramIdQr;

    if (typeof idQr === 'string' && idQr.length > 0 && idQr.length <= MAX_IDQR_LENGTH) {
      return `idqr:${idQr}`;
    }

    const cf = req.headers?.['cf-connecting-ip'];
    if (isValidIp(cf)) return `ip:${cf}`;

    const xff = req.headers?.['x-forwarded-for'];
    if (typeof xff === 'string' && xff.length) {
      const first = xff.split(',')[0].trim();
      if (isValidIp(first)) return `ip:${first}`;
    }

    return `ip:${req.ip ?? 'unknown'}`;
  }
}
