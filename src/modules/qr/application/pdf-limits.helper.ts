/**
 * Helper compartido (SPEC-005 RF-5): límite de items PDF por QR multilink.
 * Usado por el validador del schema (`case 'list'`) y por el controller
 * (`POST /qr/list-pdf`) para evitar divergencias de default.
 *
 * Síncrono a propósito: el validador de Mongoose corre en el proceso del
 * backend y no puede ser async. Fallback: 2 (decisión 2026-08-11).
 */
export function getMaxPdfItemsPerQr(): number {
  const raw = process.env.MAX_PDF_ITEMS_PER_QR;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2;
}
