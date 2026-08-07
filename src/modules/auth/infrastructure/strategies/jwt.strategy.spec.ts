import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { GetUserUseCase } from '../../../users/application/use-cases/get-user.usecase';
import { TraceService } from '../../../../common/services/trace.service';
import type { User } from '../../../users/domain/entities/user.entity';

describe('JwtStrategy', () => {
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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('jwt-secret') },
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

  describe('validate', () => {
    it('debe retornar el usuario autenticado a partir del payload', async () => {
      getUserUseCase.execute.mockResolvedValue(mockUser);

      const result = await strategy.validate({
        sub: 'user-1',
        email: 'test@test.com',
        userName: 'testuser',
        role: 'user',
        isEmailVerified: true,
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
  });
});