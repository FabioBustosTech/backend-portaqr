/**
 * Tests de stripHtml (SPEC-008 Capa 1 — R1 XSS, limpieza de entrada).
 * Criterio CA-01 (redefinido): el contenido se guarda/envía sin formato HTML —
 * las etiquetas se eliminan y queda solo texto plano.
 */
import { stripHtml } from './strip-html.util';

describe('stripHtml (SPEC-008 H1 — limpieza de entrada)', () => {
  describe('payloads XSS (CA-01)', () => {
    it('elimina por completo el payload clásico de HTML injection', () => {
      const payload = '</p><img src=x onerror=alert(1)>';
      const cleaned = stripHtml(payload);

      // Los tags sin contenido interno (img, br…) desaparecen completos
      expect(cleaned).toBe('');
      expect(cleaned).not.toContain('<');
      expect(cleaned).not.toContain('onerror');
    });

    it('elimina <script>alert(1)</script> dejando el texto interno', () => {
      const cleaned = stripHtml('<script>alert(1)</script>');
      expect(cleaned).not.toContain('<');
      expect(cleaned).toContain('alert(1)');
    });

    it('elimina iframes y svg embebidos', () => {
      const cleaned = stripHtml('<iframe srcdoc="<svg onload=alert(1)>"></iframe>');
      expect(cleaned).not.toContain('<iframe');
      expect(cleaned).not.toContain('<svg');
      expect(cleaned).not.toContain('<');
    });

    it('conserva el texto interno de tags de formato', () => {
      const cleaned = stripHtml('<b>Hola</b> <i>mundo</i>');
      expect(cleaned).toBe('Hola mundo');
    });

    it('elimina tags sin contenido interno (img, br) junto con sus atributos', () => {
      const cleaned = stripHtml('<img src=x onerror="document.cookie">');
      expect(cleaned).toBe('');
      // Sin HTML ejecutable ni handlers sobrevivientes
      expect(cleaned).not.toContain('onerror');
    });
  });

  describe('inputs legítimos (sin regresión)', () => {
    it('no modifica texto plano sin HTML', () => {
      expect(stripHtml('Quisiera saber los precios, gracias!')).toBe(
        'Quisiera saber los precios, gracias!',
      );
    });

    it('preserva acentos, emojis y símbolos comunes', () => {
      expect(stripHtml('José María 🙂 — 100% & <3')).toBe('José María 🙂 — 100% & <3');
    });

    it('preserva emails y URLs (no son tags)', () => {
      expect(stripHtml('ana@ejemplo.com https://portaqr.cl/v2?x=1')).toBe(
        'ana@ejemplo.com https://portaqr.cl/v2?x=1',
      );
    });

    it('maneja string vacía', () => {
      expect(stripHtml('')).toBe('');
    });

    it('maneja undefined/null de forma segura (no lanza)', () => {
      expect(stripHtml(undefined as unknown as string)).toBe('');
      expect(stripHtml(null as unknown as string)).toBe('');
    });

    it('preserva < suelto sin cierre (no es un tag completo)', () => {
      // El regex requiere > de cierre: "a < b" no matchea y se preserva
      expect(stripHtml('a < b')).toBe('a < b');
    });
  });
});
