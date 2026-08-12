/**
 * Utilidades de saneamiento de salida HTML (SPEC-008 Capa 1 — R1 XSS).
 *
 * `escapeHtml` convierte una string en su representación HTML segura para
 * interpolación dentro de plantillas `<p>${...}</p>`: ningún carácter
 * interpretable por el parser HTML sobrevive, por lo que un input como
 * `</p><img src=x onerror=alert(1)>` se muestra como texto literal.
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Regex que captura cualquier carácter escapable (incluye caracteres especiales entre comillas). */
const HTML_ESCAPE_RE = /[&<>"']/g;

export function escapeHtml(value: string): string {
  if (!value) return value ?? '';
  return value.replace(HTML_ESCAPE_RE, (ch) => HTML_ESCAPE_MAP[ch]);
}
