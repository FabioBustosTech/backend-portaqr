/**
 * Utilidades de saneamiento de entrada de texto plano (SPEC-008 Capa 1 — R1 XSS).
 *
 * `stripHtml` elimina las etiquetas HTML de una string conservando el texto
 * interno visible: `<b>Hola</b> <img src=x onerror=alert(1)>` → `Hola img
 * src=x onerror=alert(1)`. El resultado es texto plano, sin HTML ejecutable —
 * apto para guardado seguro en BD y para interpolación en correos.
 *
 * (El escape de salida para correo se mantiene en `escape-html.util.ts` como
 * segunda capa de defensa.)
 */

const HTML_TAG_RE = /<[^>]*>/g;

export function stripHtml(value: string): string {
  if (!value) return value ?? '';
  return value.replace(HTML_TAG_RE, '').trim();
}
