import { generateVerificationCode, VERIFICATION_MAX_ATTEMPTS } from './code-generator.util';

/**
 * SPEC-009 A5 — generador de códigos criptográfico (CA-05: no debe existir
 * Math.random().toString(36) en el proyecto).
 */
describe('generateVerificationCode (SPEC-009 A5)', () => {
  it('genera 10 caracteres hex (40 bits de entropía)', () => {
    const code = generateVerificationCode();
    expect(code).toMatch(/^[0-9A-F]{10}$/);
  });

  it('genera códigos distintos en llamadas consecutivas', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateVerificationCode()));
    expect(codes.size).toBe(100);
  });

  it('expone el límite de intentos (5)', () => {
    expect(VERIFICATION_MAX_ATTEMPTS).toBe(5);
  });
});
