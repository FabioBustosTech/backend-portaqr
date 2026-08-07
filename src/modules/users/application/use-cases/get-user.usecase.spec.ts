import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetUserUseCase } from './get-user.usecase';
import { USER_GET_PORT } from '../../domain/constants/user.tokens';
import type { ICanGetUser } from '../../domain/ports/queries/get-user.port';
import type { User } from '../../domain/entities/user.entity';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';

describe('GetUserUseCase', () => {
  let useCase: GetUserUseCase;
  let reader: jest.Mocked<ICanGetUser>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const mockUser: User = {
    id: 'user-1',
    email: 'test@test.com',
    userName: 'testuser',
    password: 'hashed',
    firstName: 'Test',
    paternalLastName: 'Apellido',
    maternalLastName: 'Apellido2',
    role: 'user',
    isEmailVerified: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUserUseCase,
        {
          provide: USER_GET_PORT,
          useValue: {
            getById: jest.fn(),
            getByEmail: jest.fn(),
            getByUsername: jest.fn(),
            getByVerificationCode: jest.fn(),
            getByPasswordResetCode: jest.fn(),
          },
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

    useCase = module.get(GetUserUseCase);
    reader = module.get(USER_GET_PORT) as jest.Mocked<ICanGetUser>;
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe retornar el usuario cuando existe', async () => {
      reader.getById.mockResolvedValue(mockUser);

      const result = await useCase.execute('user-1', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'GetUserUseCase',
        { id: 'user-1' },
      );
      expect(reader.getById).toHaveBeenCalledWith('user-1', tracking);
      expect(result).toEqual(mockUser);
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      reader.getById.mockResolvedValue(null);

      await expect(useCase.execute('user-1', tracking)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('executeByEmail', () => {
    it('debe delegar en el puerto y retornar el usuario o null', async () => {
      reader.getByEmail.mockResolvedValue(mockUser);

      const result = await useCase.executeByEmail('test@test.com', tracking);

      expect(reader.getByEmail).toHaveBeenCalledWith('test@test.com', tracking);
      expect(result).toEqual(mockUser);
    });

    it('debe retornar null si no existe', async () => {
      reader.getByEmail.mockResolvedValue(null);

      const result = await useCase.executeByEmail('nadie@test.com', tracking);

      expect(result).toBeNull();
    });
  });

  describe('executeByUsername', () => {
    it('debe delegar a getByUsername', async () => {
      reader.getByUsername.mockResolvedValue(mockUser);

      const result = await useCase.executeByUsername('testuser', tracking);

      expect(reader.getByUsername).toHaveBeenCalledWith('testuser', tracking);
      expect(result).toEqual(mockUser);
    });
  });

  describe('executeByVerificationCode', () => {
    it('debe delegar a getByVerificationCode', async () => {
      reader.getByVerificationCode.mockResolvedValue(mockUser);

      const result = await useCase.executeByVerificationCode('ABC123', tracking);

      expect(reader.getByVerificationCode).toHaveBeenCalledWith(
        'ABC123',
        tracking,
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe('executeByPasswordResetCode', () => {
    it('debe delegar a getByPasswordResetCode', async () => {
      reader.getByPasswordResetCode.mockResolvedValue(mockUser);

      const result = await useCase.executeByPasswordResetCode(
        'RESET123',
        tracking,
      );

      expect(reader.getByPasswordResetCode).toHaveBeenCalledWith(
        'RESET123',
        tracking,
      );
      expect(result).toEqual(mockUser);
    });
  });
});