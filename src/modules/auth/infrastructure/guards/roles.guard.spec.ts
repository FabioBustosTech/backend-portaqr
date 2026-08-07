import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from 'src/common/decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockContext = (user?: { role?: string }): ExecutionContext =>
    ({
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get(Reflector);
  });

  it('debe estar definido', () => {
    expect(guard).toBeDefined();
  });

  it('debe permitir el acceso si no hay roles requeridos', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);

    const result = guard.canActivate(mockContext({ role: 'user' }));

    expect(result).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      expect.any(Function),
      expect.any(Function),
    ]);
  });

  it('debe permitir el acceso si el usuario tiene un rol requerido', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['admin', 'user']);

    const result = guard.canActivate(mockContext({ role: 'admin' }));

    expect(result).toBe(true);
  });

  it('debe denegar el acceso si el usuario no tiene un rol requerido', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['admin']);

    const result = guard.canActivate(mockContext({ role: 'user' }));

    expect(result).toBe(false);
  });

  it('debe denegar el acceso si no hay usuario en el request', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['admin']);

    const result = guard.canActivate(mockContext());

    expect(result).toBe(false);
  });
});
