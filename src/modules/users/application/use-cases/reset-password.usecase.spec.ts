import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ResetPasswordUseCase } from './reset-password.usecase';
import { USER_GET_PORT, USER_UPDATE_PORT } from '../../domain/constants/user.tokens';
import type { ICanGetUser } from '../../domain/ports/queries/get-user.port';
import type { ICanUpdateUser } from '../../domain/ports/queries/create-user.port';
import type { User } from '../../domain/entities/user.entity';
import { PasswordService } from '../../domain/services/password.service';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';

describe('ResetPasswordUseCase', () => {
  let useCase: ResetPasswordUseCase;
  let reader: jest.Mocked<ICanGetUser>;
  let updater: jest.Mocked<ICanUpdateUser>;
  let passwordService: jest.Mocked<PasswordService>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const baseUser: User = {
    id: 'user-1',
    email: 'test@test.com',
    userName: 'testuser',
    firstName: 'Test',
    paternalLastName: 'Apellido',
    maternalLastName: 'Apellido2',
    role: 'user',
    isEmailVerified: true,
    passwordResetCode: 'RESET123',
    passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResetPasswordUseCase,
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

    useCase = module.get(ResetPasswordUseCase);
    reader = module.get(USER_GET_PORT) as jest.Mocked<ICanGetUser>;
    updater = module.get(USER_UPDATE_PORT) as jest.Mocked<ICanUpdateUser>;
    passwordService = module.get(PasswordService);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe resetear la contraseña con un código válido y vigente', async () => {
      reader.getByEmail.mockResolvedValue(baseUser);
      passwordService.hashPassword.mockResolvedValue('hashed-new');
      updater.update.mockResolvedValue(baseUser);

      await useCase.execute('test@test.com', 'RESET123', 'nueva123', tracking);

      expect(reader.getByEmail).toHaveBeenCalledWith('test@test.com', tracking);
      expect(passwordService.hashPassword).toHaveBeenCalledWith('nueva123');
      expect(updater.update).toHaveBeenCalledWith(
        'user-1',
        {
          password: 'hashed-new',
          passwordResetCode: undefined,
          passwordResetExpires: undefined,
          passwordResetAttempts: 0,
        },
        tracking,
      );
      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'ResetPasswordUseCase - actualizado',
        { email: 'test@test.com' },
      );
    });

    it('debe lanzar BadRequestException si el usuario no existe', async () => {
      reader.getByEmail.mockResolvedValue(null);

      await expect(
        useCase.execute('nadie@test.com', 'RESET123', 'nueva123', tracking),
      ).rejects.toThrow(NotFoundException);
      expect(updater.update).not.toHaveBeenCalled();
    });

    it('debe lanzar BadRequestException si no hay código de recuperación pendiente', async () => {
      reader.getByEmail.mockResolvedValue({
        ...baseUser,
        passwordResetCode: undefined,
        passwordResetExpires: undefined,
      });

      await expect(
        useCase.execute('test@test.com', 'RESET123', 'nueva123', tracking),
      ).rejects.toThrow(BadRequestException);
    });

    it('SPEC-009 A5: código inválido incrementa passwordResetAttempts (1 fallo)', async () => {
      reader.getByEmail.mockResolvedValue(baseUser);

      await expect(
        useCase.execute('test@test.com', 'WRONG99', 'nueva123', tracking),
      ).rejects.toThrow(BadRequestException);
      expect(updater.update).toHaveBeenCalledWith(
        'user-1',
        { passwordResetAttempts: 1 },
        tracking,
      );
      expect(passwordService.hashPassword).not.toHaveBeenCalled();
    });

    it('SPEC-009 A5: 5 fallos → invalida el código (responde expirado y borra)', async () => {
      reader.getByEmail.mockResolvedValue({
        ...baseUser,
        passwordResetAttempts: 4,
      });

      await expect(
        useCase.execute('test@test.com', 'WRONG99', 'nueva123', tracking),
      ).rejects.toThrow('El cÃ³digo de recuperaciÃ³n ha expirado');
      expect(updater.update).toHaveBeenCalledWith(
        'user-1',
        {
          passwordResetCode: undefined,
          passwordResetExpires: undefined,
          passwordResetAttempts: 0,
        },
        tracking,
      );
    });

    it('debe lanzar BadRequestException si el código ha expirado', async () => {
      reader.getByEmail.mockResolvedValue({
        ...baseUser,
        passwordResetExpires: new Date(Date.now() - 60 * 60 * 1000),
      });

      await expect(
        useCase.execute('test@test.com', 'RESET123', 'nueva123', tracking),
      ).rejects.toThrow(BadRequestException);
      expect(updater.update).not.toHaveBeenCalled();
    });
  });
});