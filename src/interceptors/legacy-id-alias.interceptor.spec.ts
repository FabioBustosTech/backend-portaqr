import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { LegacyIdAliasInterceptor } from './legacy-id-alias.interceptor';

describe('LegacyIdAliasInterceptor', () => {
  let interceptor: LegacyIdAliasInterceptor;

  const mockContext = (): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({}), getResponse: () => ({}) }),
    }) as unknown as ExecutionContext;

  const callHandler = (data: unknown): CallHandler => ({
    handle: () => of(data),
  });

  beforeEach(() => {
    interceptor = new LegacyIdAliasInterceptor();
  });

  it('debe estar definido', () => {
    expect(interceptor).toBeDefined();
  });

  it('debe agregar _id como alias de id en un objeto plano', (done) => {
    interceptor
      .intercept(mockContext(), callHandler({ id: 'abc', name: 'test' }))
      .subscribe((result) => {
        expect(result).toEqual({ id: 'abc', _id: 'abc', name: 'test' });
        done();
      });
  });

  it('debe no sobreescribir _id si ya existe', (done) => {
    interceptor
      .intercept(mockContext(), callHandler({ id: 'abc', _id: 'original' }))
      .subscribe((result) => {
        expect(result).toEqual({ id: 'abc', _id: 'original' });
        done();
      });
  });

  it('debe mapear arrays recursivamente', (done) => {
    interceptor
      .intercept(
        mockContext(),
        callHandler([{ id: 'a' }, { id: 'b', name: 'x' }]),
      )
      .subscribe((result) => {
        expect(result).toEqual([
          { id: 'a', _id: 'a' },
          { id: 'b', _id: 'b', name: 'x' },
        ]);
        done();
      });
  });

  it('debe procesar objetos anidados', (done) => {
    interceptor
      .intercept(
        mockContext(),
        callHandler({ user: { id: 'u1' }, items: [{ id: 'i1' }] }),
      )
      .subscribe((result) => {
        expect(result).toEqual({
          user: { id: 'u1', _id: 'u1' },
          items: [{ id: 'i1', _id: 'i1' }],
        });
        done();
      });
  });

  it('debe dejar Date, Buffer y primitivos sin cambios', (done) => {
    const date = new Date('2024-01-01');
    const buffer = Buffer.from('data');
    interceptor
      .intercept(
        mockContext(),
        callHandler({ date, buffer, num: 42, str: 'hola' }),
      )
      .subscribe((result) => {
        const r = result as Record<string, unknown>;
        expect(r.date).toBe(date);
        expect(r.buffer).toBe(buffer);
        expect(r.num).toBe(42);
        expect(r.str).toBe('hola');
        done();
      });
  });

  it('debe retornar null/undefined sin cambios', (done) => {
    interceptor
      .intercept(mockContext(), callHandler(null))
      .subscribe((result) => {
        expect(result).toBeNull();
        done();
      });
  });

  it('debe retornar primitivos sin cambios', (done) => {
    interceptor
      .intercept(mockContext(), callHandler('texto'))
      .subscribe((result) => {
        expect(result).toBe('texto');
        done();
      });
  });

  it('debe cortar la recursión a profundidad > 10', (done) => {
    // Construimos un objeto profundamente anidado
    let deep: Record<string, unknown> = { id: 'x' };
    for (let i = 0; i < 12; i++) {
      deep = { child: deep };
    }

    interceptor
      .intercept(mockContext(), callHandler(deep))
      .subscribe((result) => {
        // No debe lanzar y debe retornar algo
        expect(result).toBeDefined();
        done();
      });
  });
});