import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { ResponseLoggerInterceptor } from './response-logger.interceptor';

describe('ResponseLoggerInterceptor', () => {
  let interceptor: ResponseLoggerInterceptor;

  const createRes = () => {
    const handlers: Record<string, () => void> = {};
    const sendMock = jest.fn(function (this: unknown, body: unknown) {
      return body;
    });
    return {
      send: sendMock,
      _sendMock: sendMock,
      on: jest.fn((event: string, cb: () => void) => {
        handlers[event] = cb;
      }),
      statusCode: 200,
      getHeaders: jest.fn(() => ({ 'content-type': 'application/json' })),
      _handlers: handlers,
    };
  };

  const mockContext = (req: unknown, res: unknown): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    }) as unknown as ExecutionContext;

  const callHandler = (): CallHandler => ({
    handle: () => of('ok'),
  });

  beforeEach(() => {
    interceptor = new ResponseLoggerInterceptor();
    // Silenciar el logger
    jest.spyOn(interceptor['logger'], 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('debe estar definido', () => {
    expect(interceptor).toBeDefined();
  });

  it('debe interceptar res.send y loguear en el evento finish', () => {
    const res = createRes();
    const req = {
      originalUrl: '/api/test',
      headers: { 'x-tracking-id': 'track-1' },
    };
    const logSpy = jest.spyOn(interceptor['logger'], 'log');

    interceptor.intercept(mockContext(req, res), callHandler()).subscribe();

    // Simular que el handler de la respuesta envía un body JSON string
    res.send(JSON.stringify({ ok: true }));
    // Disparar el evento finish
    res._handlers['finish']();

    expect(res._sendMock).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('"status": 200'),
      'ResponseLogger',
      'ResponseLogger',
      'track-1',
    );
  });

  it('debe loguear body JSON parseado cuando es string JSON', () => {
    const res = createRes();
    const req = { originalUrl: '/x', headers: {} };
    const logSpy = jest.spyOn(interceptor['logger'], 'log');

    interceptor.intercept(mockContext(req, res), callHandler()).subscribe();

    res.send('{"a":1}');
    res._handlers['finish']();

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('"a": 1'),
      'ResponseLogger',
      'ResponseLogger',
      undefined,
    );
  });

  it('debe loguear texto plano cuando el string no es JSON', () => {
    const res = createRes();
    const req = { originalUrl: '/x', headers: {} };
    const logSpy = jest.spyOn(interceptor['logger'], 'log');

    interceptor.intercept(mockContext(req, res), callHandler()).subscribe();

    res.send('texto plano');
    res._handlers['finish']();

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('texto plano'),
      'ResponseLogger',
      'ResponseLogger',
      undefined,
    );
  });

  it('debe loguear "Binary data (Buffer)" cuando el body es un Buffer', () => {
    const res = createRes();
    const req = { originalUrl: '/x', headers: {} };
    const logSpy = jest.spyOn(interceptor['logger'], 'log');

    interceptor.intercept(mockContext(req, res), callHandler()).subscribe();

    res.send(Buffer.from('binary'));
    res._handlers['finish']();

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Binary data (Buffer)'),
      'ResponseLogger',
      'ResponseLogger',
      undefined,
    );
  });

  it('debe loguear el body directo cuando ya es un objeto', () => {
    const res = createRes();
    const req = { originalUrl: '/x', headers: {} };
    const logSpy = jest.spyOn(interceptor['logger'], 'log');

    interceptor.intercept(mockContext(req, res), callHandler()).subscribe();

    res.send({ ok: true });
    res._handlers['finish']();

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('"ok": true'),
      'ResponseLogger',
      'ResponseLogger',
      undefined,
    );
  });

  it('debe retornar el observable del handler', () => {
    const res = createRes();
    const req = { originalUrl: '/x', headers: {} };

    const result = interceptor.intercept(mockContext(req, res), callHandler());

    result.subscribe((value) => {
      expect(value).toBe('ok');
    });
  });
});