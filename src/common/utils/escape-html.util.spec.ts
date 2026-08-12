/**
 * Tests de escapeHtml (SPEC-008 Capa 1 — R1 XSS correo de contacto).
 * Criterio CA-01: el correo recibido muestra el texto escapado sin HTML ejecutable.
 */
import { escapeHtml } from './escape-html.util';

describe('escapeHtml (SPEC-008 H1 — XSS correo contacto)', () => {
  describe('caracteres HTML especiales', () => {
    it('escapa & → &amp;', () => {
      expect(escapeHtml('a & b')).toBe('a &amp; b');
    });

    it('escapa < → &lt;', () => {
      expect(escapeHtml('a < b')).toBe('a &lt; b');
    });

    it('escapa > → &gt;', () => {
      expect(escapeHtml('a > b')).toBe('a &gt; b');
    });

    it('escapa " → &quot;', () => {
      expect(escapeHtml('dijo "hola"')).toBe('dijo &quot;hola&quot;');
    });

    it("escapa ' → &#39;", () => {
      expect(escapeHtml("it's")).toBe('it&#39;s');
    });

    it('escapa todos los caracteres juntos', () => {
      expect(escapeHtml(`<a href="x" onclick='y'>&</a>`)).toBe(
        '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
      );
    });
  });

  describe('payloads maliciosos (CA-01)', () => {
    it('neutraliza el payload clásico de HTML injection en el mensaje', () => {
      const payload = '</p><img src=x onerror=alert(1)>';
      const escaped = escapeHtml(payload);

      expect(escaped).toBe('&lt;/p&gt;&lt;img src=x onerror=alert(1)&gt;');
      // El resultado NO debe contener tags interpretables
      expect(escaped).not.toContain('</p>');
      expect(escaped).not.toContain('<img');
      expect(escaped).not.toContain('</p><'); // cierre+etiqueta: técnica del payload
      // Pero sí debe contener el texto visible (escapado)
      expect(escaped).toContain('img src=x onerror=alert(1)');
    });

    it('neutraliza <script>alert(1)</script>', () => {
      const escaped = escapeHtml('<script>alert(1)</script>');
      expect(escaped).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(escaped).not.toMatch(/<script>/);
    });

    it('neutraliza atributos con handlers (onerror/onload/onclick)', () => {
      const escaped = escapeHtml('<img src=x onerror="document.cookie">');
      expect(escaped).not.toContain('<img'); // tag no interpretable
      expect(escaped).not.toContain('onerror="'); // handler no parseable como atributo
      expect(escaped).toContain('document.cookie'); // texto visible preservado
    });

    it('neutraliza iframes y svg embebidos', () => {
      const escaped = escapeHtml('<iframe srcdoc="<svg onload=alert(1)>"></iframe>');
      expect(escaped).not.toContain('<iframe');
      expect(escaped).not.toContain('<svg');
    });
  });

  describe('inputs legítimos', () => {
    it('no modifica texto plano', () => {
      expect(escapeHtml('Quisiera saber los precios')).toBe(
        'Quisiera saber los precios',
      );
    });

    it('no modifica texto con acentos y emojis', () => {
      expect(escapeHtml('José María Pérez 🙂 ñandú')).toBe(
        'José María Pérez 🙂 ñandú',
      );
    });

    it('preserva números, email y URLs simples', () => {
      expect(escapeHtml('ana@ejemplo.com https://portaqr.cl/v2?x=1')).toBe(
        'ana@ejemplo.com https://portaqr.cl/v2?x=1',
      );
    });

    it('maneja string vacía', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('maneja undefined/null de forma segura (no lanza)', () => {
      expect(escapeHtml(undefined as unknown as string)).toBe('');
      expect(escapeHtml(null as unknown as string)).toBe('');
    });

    it('escapa una entidad preexistente de forma idempotente en la primera pasada (& se escapa primero)', () => {
      // & se convierte a &amp; — el resto de entidades del texto original se tratan como texto
      expect(escapeHtml('&amp;')).toBe('&amp;amp;');
    });
  });
});
