import {
  TRANSACTION_CREATE_PORT,
  TRANSACTION_GET_PORT,
  TRANSACTION_UPDATE_PORT,
  WEBPAY_GATEWAY_PORT,
} from './webpay.tokens';

describe('Tokens de Webpay', () => {
  it('deben ser Symbols', () => {
    expect(typeof TRANSACTION_CREATE_PORT).toBe('symbol');
    expect(typeof TRANSACTION_GET_PORT).toBe('symbol');
    expect(typeof TRANSACTION_UPDATE_PORT).toBe('symbol');
    expect(typeof WEBPAY_GATEWAY_PORT).toBe('symbol');
  });

  it('deben ser únicos entre sí', () => {
    const tokens = [
      TRANSACTION_CREATE_PORT,
      TRANSACTION_GET_PORT,
      TRANSACTION_UPDATE_PORT,
      WEBPAY_GATEWAY_PORT,
    ];

    expect(new Set(tokens).size).toBe(4);
  });
});