import { getMaxPdfItemsPerQr } from './pdf-limits.helper';

describe('getMaxPdfItemsPerQr (SPEC-005 RF-5)', () => {
  const ENV_KEY = 'MAX_PDF_ITEMS_PER_QR';

  afterEach(() => {
    delete process.env[ENV_KEY];
  });

  it('retorna el default 2 sin env configurado', () => {
    delete process.env[ENV_KEY];
    expect(getMaxPdfItemsPerQr()).toBe(2);
  });

  it('retorna el valor del env cuando es un entero positivo', () => {
    process.env[ENV_KEY] = '5';
    expect(getMaxPdfItemsPerQr()).toBe(5);
  });

  it('retorna el default si el env no es numérico (fallback)', () => {
    process.env[ENV_KEY] = 'abc';
    expect(getMaxPdfItemsPerQr()).toBe(2);
  });

  it('retorna el default si el env está vacío (fallback)', () => {
    process.env[ENV_KEY] = '';
    expect(getMaxPdfItemsPerQr()).toBe(2);
  });

  it('retorna el default si el env es 0 (fallback)', () => {
    process.env[ENV_KEY] = '0';
    expect(getMaxPdfItemsPerQr()).toBe(2);
  });

  it('retorna el default si el env es negativo (fallback)', () => {
    process.env[ENV_KEY] = '-1';
    expect(getMaxPdfItemsPerQr()).toBe(2);
  });
});
