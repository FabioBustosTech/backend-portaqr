import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { GetUser } from './user.decorator';

describe('GetUser decorator', () => {
  const getFactory = (): ((data: unknown, ctx: ExecutionContext) => unknown) => {
    class TestController {
      handler(@GetUser() _user: unknown): void {}
    }
    const metadata = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      TestController,
      'handler',
    );
    const param = Object.values(metadata)[0] as {
      factory: (data: unknown, ctx: ExecutionContext) => unknown;
    };
    return param.factory;
  };

  const mockContext = (user?: unknown): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  it('debe retornar el usuario del request', () => {
    const factory = getFactory();
    const user = { id: 'user-1', role: 'admin' };
    const result = factory(undefined, mockContext(user));
    expect(result).toEqual(user);
  });

  it('debe retornar undefined si el request no tiene usuario', () => {
    const factory = getFactory();
    const result = factory(undefined, mockContext(undefined));
    expect(result).toBeUndefined();
  });
});