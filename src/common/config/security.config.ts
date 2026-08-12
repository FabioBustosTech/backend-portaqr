/**
 * Configuración perimetral del backend (SPEC-008 H4 — R4):
 * helmet + CORS whitelist. Compartida entre main.ts y los tests.
 */
import type { HelmetOptions } from 'helmet';

/**
 * Opciones de helmet con CSP ajustado al proyecto:
 * - `style-src 'unsafe-inline'`: los templates EJS de email (registerEmail.ejs,
 *   passwordReset.ejs) usan `<style>` inline — el default de helmet los rompería.
 * - `img-src` amplio: los emails referencian imágenes de datos/data URIs.
 * - `default-src 'self'`: el resto (API JSON, scripts propios) se mantiene estricto.
 */
export const HELMET_OPTIONS: HelmetOptions = {
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
    },
  },
};

/**
 * Parsea la variable CORS_ORIGINS a la forma que espera enableCors:
 * - indefinido/vacío → '*' (dev, sin restricción)
 * - '*' literal → '*' (dev explícito)
 * - lista separada por comas → array de orígenes (prod)
 * @example parseCorsOrigins('https://app.portaqr.cl,https://admin.portaqr.cl')
 *   → ['https://app.portaqr.cl', 'https://admin.portaqr.cl']
 */
export function parseCorsOrigins(raw: string | undefined): string | string[] {
  if (!raw || raw.trim() === '') return '*';
  const origins = raw
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
  if (origins.length === 0) return '*';
  if (origins.includes('*')) return '*';
  return origins;
}
