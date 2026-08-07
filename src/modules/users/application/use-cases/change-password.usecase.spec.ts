import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ChangePasswordUseCase } from './change-password.usecase';
import { USER_GET_PORT, USER_UPDATE_PORT } from '../../domain/constants/user.tokens';
import type { ICanGetUser } from '../../domain/ports/queries/get-user.port';
import type { ICanUpdateUser } from '../../domain/ports/queries/create-user.port';
import type { User } from '../../domain/entities/user.entity';
import { PasswordService } from '../../domain/services/password.service';
import type { ChangePasswordDto } from '../dto/change-password.dto';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';

describe('ChangePasswordUseCase', () => {
  let useCase: ChangePasswordUseCase;
  let reader: jest.Mocked<ICanGetUser>;
  let updater: jest.Mocked<ICanUpdateUser>;
  let passwordService: jest.Mocked<PasswordService>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const mockUser: User = {
    id: 'user-1',
    email: 'test@test.com',
    userName: 'testuser',
    password: 'hashed-current',
    firstName: 'Test',
    paternalLastName: 'Apellido',
    maternalLastName: 'Apellido2',
    role: 'user',
    isEmailVerified: true,
  };

  const dto: ChangePasswordDto = {
    currentPassword: 'password123',
    newPassword: 'newpassword123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChangePasswordUseCase,
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
          provide: USER_UPDATE_PORT,
          useValue: {
            update: jest.fn(),
            updateLastLogin: jest.fn(),
          },
        },
        {
          provide: PasswordService,
          useValue: {
            hashPassword: jest.fn(),
            comparePassword: jest.fn(),
            isPasswordStrong: jest.fn(),
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

    useCase = module.get(ChangePasswordUseCase);
    reader = module.get(USER_GET_PORT) as jest.Mocked<ICanGetUser>;
    updater = module.get(USER_UPDATE_PORT) as jest.Mocked<ICanUpdateUser>;
    passwordService = module.get(PasswordService);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe cambiar la contraseña cuando la actual es correcta', async () => {
      reader.getById.mockResolvedValue(mockUser);
      passwordService.comparePassword.mockResolvedValue(true);
      passwordService.hashPassword.mockResolvedValue('hashed-new');
      updater.update.mockResolvedValue({ ...mockUser, password: 'hashed-new' });

      await useCase.execute('user-1', dto, tracking);

      expect(reader.getById).toHaveBeenCalledWith('user-1', tracking);
      expect(passwordService.comparePassword).toHaveBeenCalledWith(
        'password123',
        'hashed-current',
      );
      expect(passwordService.hashPassword).toHaveBeenCalledWith(
        'newpassword123',
      );
      expect(updater.update).toHaveBeenCalledWith(
        'user-1',
        { password: 'hashed-new' },
        tracking,
      );
      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'ChangePasswordUseCase - cambiada',
        { usuarioId: 'user-1' },
      );
    });

    it('debe lanzar UnauthorizedException si el usuario no existe', async () => {
      reader.getById.mockResolvedValue(null);

      await expect(useCase.execute('user-1', dto, tracking)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(passwordService.comparePassword).not.toHaveBeenCalled();
    });

    it('debe lanzar UnauthorizedException si el usuario no tiene contraseña', async () => {
      reader.getById.mockResolvedValue({ ...mockUser, password: undefined });

      await expect(useCase.execute('user-1', dto, tracking)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(passwordService.comparePassword).not.toHaveBeenCalled();
    });

    it('debe lanzar UnauthorizedException si la contraseña actual es incorrecta', async () => {
      reader.getById.mockResolvedValue(mockUser);
      passwordService.comparePassword.mockResolvedValue(false);

      await expect(useCase.execute('user-1', dto, tracking)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(updater.update).not.toHaveBeenCalled();
    });
  });
});