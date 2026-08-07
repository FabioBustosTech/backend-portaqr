import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  const mockContext = (): ExecutionContext =>
    ({
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get(Reflector);
  });

  it('debe estar definido', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('debe retornar true si la ruta es pública', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

      const result = await guard.canActivate(mockContext());

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        expect.any(Function),
        expect.any(Function),
      ]);
    });

    it('debe delegar al guard de passport cuando la ruta no es pública', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);

      // Espiamos el canActivate de la clase padre (AuthGuard de passport)
      const parentProto = Object.getPrototypeOf(JwtAuthGuard.prototype);
      const parentSpy = jest
        .spyOn(parentProto, 'canActivate')
        .mockResolvedValue(true);

      const result = await guard.canActivate(mockContext());

      expect(parentSpy).toHaveBeenCalled();
      expect(result).toBe(true);
      parentSpy.mockRestore();
    });
  });

  describe('handleRequest', () => {
    it('debe retornar el usuario cuando no hay error', () => {
      const user = { id: 'user-1' };
      const result = guard.handleRequest(null, user, null);
      expect(result).toBe(user);
    });

    it('debe lanzar UnauthorizedException si no hay usuario', () => {
      expect(() => guard.handleRequest(null, null, null)).toThrow(
        UnauthorizedException,
      );
    });

    it('debe propagar el error recibido', () => {
      const err = new Error('custom');
      expect(() => guard.handleRequest(err, null, null)).toThrow(err);
    });
  });
});
