/**
 * Tests de la config perimetral (SPEC-008 H4 — R4):
 * parseCorsOrigins + HELMET_OPTIONS (CSP que no rompe templates EJS).
 */
import { HELMET_OPTIONS, parseCorsOrigins } from './security.config';

/** Subconjunto del tipo de opciones de CSP de helmet (no exportado del módulo raíz). */
interface CspOptionsShape {
  useDefaults?: boolean;
  directives?: Record<string, Iterable<string> | null | (() => string)>;
}

/** Extrae las opciones de CSP cuando están activas (siempre en HELMET_OPTIONS). */
function cspOptions(): CspOptionsShape {
  const csp = HELMET_OPTIONS.contentSecurityPolicy;
  if (typeof csp === 'boolean') throw new Error('CSP debe estar habilitado');
  return csp as CspOptionsShape;
}

describe('parseCorsOrigins (SPEC-008 H4 — R4, CA-05)', () => {
  it('devuelve * cuando la variable no está definida (dev)', () => {
    expect(parseCorsOrigins(undefined)).toBe('*');
  });

  it('devuelve * cuando la variable está vacía (dev)', () => {
    expect(parseCorsOrigins('')).toBe('*');
    expect(parseCorsOrigins('   ')).toBe('*');
  });

  it('devuelve * cuando se declara explícitamente', () => {
    expect(parseCorsOrigins('*')).toBe('*');
  });

  it('parsea una lista separada por comas en un array de orígenes', () => {
    expect(
      parseCorsOrigins('https://app.portaqr.cl,https://admin.portaqr.cl'),
    ).toEqual(['https://app.portaqr.cl', 'https://admin.portaqr.cl']);
  });

  it('recorta espacios alrededor de cada origen', () => {
    expect(parseCorsOrigins(' https://a.cl , https://b.cl ')).toEqual([
      'https://a.cl',
      'https://b.cl',
    ]);
  });

  it('ignora entradas vacías de la lista', () => {
    expect(parseCorsOrigins('https://a.cl,,https://b.cl')).toEqual([
      'https://a.cl',
      'https://b.cl',
    ]);
  });

  it('devuelve * si la lista contiene * (modo dev con lista)', () => {
    expect(parseCorsOrigins('*,https://a.cl')).toBe('*');
  });

  it('devuelve * si la lista queda vacía tras filtrar', () => {
    expect(parseCorsOrigins(',,')).toBe('*');
  });
});

describe('HELMET_OPTIONS (SPEC-008 H4 — R4)', () => {
  it('mantiene CSP activo (defensa contra XSS en respuestas)', () => {
    expect(HELMET_OPTIONS.contentSecurityPolicy).toBeDefined();
    expect(cspOptions().useDefaults).toBe(true);
  });

  it('permite style inline para no romper los templates EJS de email', () => {
    const styleSrc = cspOptions().directives?.['style-src'];
    expect(styleSrc).toBeDefined();
    expect(Array.from(styleSrc as Iterable<string>)).toContain("'unsafe-inline'");
  });

  it('permite imágenes data: y https: (emails con imágenes remotas)', () => {
    const imgSrc = Array.from(
      (cspOptions().directives?.['img-src'] as Iterable<string>) ?? [],
    );
    expect(imgSrc).toEqual(expect.arrayContaining(["'self'", 'data:', 'https:']));
  });
});
