import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { Tracking, TrackingContext } from './tracking.decorator';

describe('Tracking decorator', () => {
  // La factory del decorator se registra en metadata al aplicar el decorator
  // a un método. La extraemos para invocarla con un ExecutionContext simulado.
  const getFactory = (): ((data: unknown, ctx: ExecutionContext) => TrackingContext) => {
    class TestController {
      handler(@Tracking() _tracking: TrackingContext): void {}
    }
    const metadata = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      TestController,
      'handler',
    );
    const param = Object.values(metadata)[0] as { factory: (data: unknown, ctx: ExecutionContext) => TrackingContext };
    return param.factory;
  };

  const mockContext = (req: unknown): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    }) as unknown as ExecutionContext;

  it('debe construir TrackingContext a partir de los headers', () => {
    const factory = getFactory();
    const req = {
      headers: {
        'x-tracking-id': 'track-1',
        'x-session-id': 'sess-1',
        origin: 'http://localhost:3000',
        'user-agent': 'jest-agent',
        'x-forwarded-for': '1.2.3.4',
      },
      ip: '127.0.0.1',
    };

    const result = factory(undefined, mockContext(req));

    // req.ip tiene prioridad sobre x-forwarded-for
    expect(result).toEqual({
      trackingId: 'track-1',
      sessionId: 'sess-1',
      origin: 'http://localhost:3000',
      userAgent: 'jest-agent',
      ip: '127.0.0.1',
    });
  });

  it('debe usar x-forwarded-for como fallback de ip cuando no hay req.ip', () => {
    const factory = getFactory();
    const req = {
      headers: {
        'x-forwarded-for': '1.2.3.4',
      },
    };

    const result = factory(undefined, mockContext(req));

    expect(result.ip).toBe('1.2.3.4');
  });

  it('debe usar x-request-id como fallback de trackingId', () => {
    const factory = getFactory();
    const req = {
      headers: {
        'x-request-id': 'req-1',
        'x-session-id': 'sess-1',
      },
    };

    const result = factory(undefined, mockContext(req));

    expect(result.trackingId).toBe('req-1');
  });

  it('debe usar remoteAddress como fallback de origin', () => {
    const factory = getFactory();
    const req = {
      headers: {},
      connection: { remoteAddress: '10.0.0.1' },
    };

    const result = factory(undefined, mockContext(req));

    expect(result.origin).toBe('10.0.0.1');
  });

  it('debe usar defaults cuando no hay headers', () => {
    const factory = getFactory();
    const req = { headers: {} };

    const result = factory(undefined, mockContext(req));

    expect(result).toEqual({
      trackingId: 'unknown',
      sessionId: 'unknown',
      origin: undefined,
      userAgent: undefined,
      ip: undefined,
    });
  });

  it('debe tolerar un request sin headers', () => {
    const factory = getFactory();
    const result = factory(undefined, mockContext({}));

    expect(result.trackingId).toBe('unknown');
    expect(result.sessionId).toBe('unknown');
  });
});