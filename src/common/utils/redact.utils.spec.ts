import { sanitizeForLog } from './redact.utils';

/**
 * SPEC-009 A13 — sanitización de logs (CA-10).
 */
describe('sanitizeForLog (SPEC-009 A13)', () => {
  it('redacta campos sensibles en cualquier nivel de anidación', () => {
    const result = sanitizeForLog({
      id: 'tx-1',
      token: 'secret-token',
      user: { password: 'secret', email: 'a@b.cl' },
      items: [{ token_ws: 'ws-123' }],
    });
    expect(result).toEqual({
      id: 'tx-1',
      token: '[REDACTED]',
      user: { password: '[REDACTED]', email: 'a@b.cl' },
      items: [{ token_ws: '[REDACTED]' }],
    });
  });

  it('default-deny: con allowedFields solo conserva las keys de la whitelist', () => {
    const result = sanitizeForLog(
      { status: 'AUTHORIZED', amount: 5000, token: 'x', creditCard: '4111' },
      ['status', 'message'],
    );
    expect(result).toEqual({ status: 'AUTHORIZED' });
  });

  it('un campo sensible NO sale aunque esté en la whitelist', () => {
    const result = sanitizeForLog({ token: 'x', pin: '1234' }, ['token', 'pin']);
    expect(result).toEqual({ token: '[REDACTED]', pin: '[REDACTED]' });
  });

  it('maneja arrays y valores primitivos', () => {
    expect(sanitizeForLog(['a', { code: 'c' }])).toEqual(['a', { code: '[REDACTED]' }]);
    expect(sanitizeForLog('hola')).toBe('hola');
    expect(sanitizeForLog(42)).toBe(42);
    expect(sanitizeForLog(null)).toBeNull();
  });

  it('respeta el valor de redacción custom', () => {
    expect(sanitizeForLog({ password: 'x' }, undefined, '***')).toEqual({ password: '***' });
  });
});
