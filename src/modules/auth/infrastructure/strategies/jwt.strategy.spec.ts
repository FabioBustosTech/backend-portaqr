import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { GetUserUseCase } from '../../../users/application/use-cases/get-user.usecase';
import { TraceService } from '../../../../common/services/trace.service';
import type { User } from '../../../users/domain/entities/user.entity';
import { loadJwtKeys } from '../jwt-keys';

jest.mock('../jwt-keys', () => ({
  loadJwtKeys: jest.fn(),
}));

describe('JwtStrategy', () => {
  let module: TestingModule;
  let strategy: JwtStrategy;
  let getUserUseCase: jest.Mocked<GetUserUseCase>;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@test.com',
    userName: 'testuser',
    firstName: 'Test',
    paternalLastName: 'A',
    maternalLastName: 'B',
    role: 'user',
    isEmailVerified: true,
    tokenVersion: 0,
  };

  beforeEach(async () => {
    (loadJwtKeys as jest.Mock).mockReturnValue({
      privateKey: 'PRIVATE_PEM',
      publicKey: 'PUBLIC_PEM',
    });

    module = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              const values = {
                JWT_PRIVATE_KEY: 'keys/jwt-private.pem',
                JWT_PUBLIC_KEY: 'keys/jwt-public.pem',
              };
              return values[key];
            }),
          },
        },
        {
          provide: GetUserUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: TraceService,
          useValue: {
            log: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    getUserUseCase = module.get(GetUserUseCase);
  });

  it('debe estar definido', () => {
    expect(strategy).toBeDefined();
  });

  it('debe leer la llave pública para verificar tokens RS256', () => {
    const configService = module.get(ConfigService);
    expect(loadJwtKeys).toHaveBeenCalledWith(configService);
  });

  describe('validate', () => {
    it('debe retornar el usuario autenticado cuando el tokenVersion coincide', async () => {
      getUserUseCase.execute.mockResolvedValue(mockUser);

      const result = await strategy.validate({
        sub: 'user-1',
        email: 'test@test.com',
        userName: 'testuser',
        role: 'user',
        isEmailVerified: true,
        tokenVersion: 0,
      });

      expect(getUserUseCase.execute).toHaveBeenCalledWith('user-1', {
        trackingId: 'jwt-validate-user-1',
        sessionId: '',
      });
      expect(result).toEqual({
        id: 'user-1',
        email: 'test@test.com',
        userName: 'testuser',
        role: 'user',
        isEmailVerified: true,
      });
    });

    it('debe aceptar tokens sin tokenVersion cuando el usuario tampoco tiene versión', async () => {
      getUserUseCase.execute.mockResolvedValue({ ...mockUser, tokenVersion: undefined });

      const result = await strategy.validate({
        sub: 'user-1',
        email: 'test@test.com',
        userName: 'testuser',
        role: 'user',
        isEmailVerified: true,
      });

      expect(result).toBeDefined();
    });

    it('debe lanzar UnauthorizedException cuando el tokenVersion no coincide (logout)', async () => {
      getUserUseCase.execute.mockResolvedValue({ ...mockUser, tokenVersion: 1 });

      await expect(
        strategy.validate({
          sub: 'user-1',
          email: 'test@test.com',
          userName: 'testuser',
          role: 'user',
          isEmailVerified: true,
          tokenVersion: 0,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
