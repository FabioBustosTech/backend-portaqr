import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { VerifyEmailUseCase } from './verify-email.usecase';
import { USER_GET_PORT, USER_UPDATE_PORT } from '../../domain/constants/user.tokens';
import type { ICanGetUser } from '../../domain/ports/queries/get-user.port';
import type { ICanUpdateUser } from '../../domain/ports/queries/create-user.port';
import type { User } from '../../domain/entities/user.entity';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';

describe('VerifyEmailUseCase', () => {
  let useCase: VerifyEmailUseCase;
  let reader: jest.Mocked<ICanGetUser>;
  let updater: jest.Mocked<ICanUpdateUser>;
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
    isEmailVerified: false,
    verificationCode: 'ABC123',
    verificationCodeExpires: new Date(Date.now() + 60 * 60 * 1000),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerifyEmailUseCase,
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

    useCase = module.get(VerifyEmailUseCase);
    reader = module.get(USER_GET_PORT) as jest.Mocked<ICanGetUser>;
    updater = module.get(USER_UPDATE_PORT) as jest.Mocked<ICanUpdateUser>;
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe verificar el email con un código válido y vigente', async () => {
      reader.getById.mockResolvedValue(baseUser);
      updater.update.mockResolvedValue({ ...baseUser, isEmailVerified: true });

      await useCase.execute('user-1', 'ABC123', tracking);

      expect(reader.getById).toHaveBeenCalledWith('user-1', tracking);
      expect(updater.update).toHaveBeenCalledWith(
        'user-1',
        {
          isEmailVerified: true,
          verificationCode: undefined,
          verificationCodeExpires: undefined,
          verificationAttempts: 0,
        },
        tracking,
      );
      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'VerifyEmailUseCase - verificado',
        { userId: 'user-1' },
      );
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      reader.getById.mockResolvedValue(null);

      await expect(
        useCase.execute('user-1', 'ABC123', tracking),
      ).rejects.toThrow(NotFoundException);
      expect(updater.update).not.toHaveBeenCalled();
    });

    it('debe lanzar BadRequestException si el email ya está verificado', async () => {
      reader.getById.mockResolvedValue({
        ...baseUser,
        isEmailVerified: true,
      });

      await expect(
        useCase.execute('user-1', 'ABC123', tracking),
      ).rejects.toThrow(BadRequestException);
      expect(updater.update).not.toHaveBeenCalled();
    });

    it('debe lanzar BadRequestException si no hay código de verificación pendiente', async () => {
      reader.getById.mockResolvedValue({
        ...baseUser,
        verificationCode: undefined,
        verificationCodeExpires: undefined,
      });

      await expect(
        useCase.execute('user-1', 'ABC123', tracking),
      ).rejects.toThrow(BadRequestException);
    });

    it('SPEC-009 A5: código inválido incrementa verificationAttempts (1 fallo)', async () => {
      reader.getById.mockResolvedValue(baseUser);

      await expect(
        useCase.execute('user-1', 'WRONG99', tracking),
      ).rejects.toThrow(BadRequestException);
      expect(updater.update).toHaveBeenCalledWith(
        'user-1',
        { verificationAttempts: 1 },
        tracking,
      );
    });

    it('SPEC-009 A5: 5 fallos → invalida el código (responde expirado y borra)', async () => {
      reader.getById.mockResolvedValue({
        ...baseUser,
        verificationAttempts: 4,
      });

      await expect(
        useCase.execute('user-1', 'WRONG99', tracking),
      ).rejects.toThrow('El código de verificación ha expirado');
      expect(updater.update).toHaveBeenCalledWith(
        'user-1',
        {
          verificationCode: undefined,
          verificationCodeExpires: undefined,
          verificationAttempts: 0,
        },
        tracking,
      );
    });

    it('debe lanzar BadRequestException si el código ha expirado', async () => {
      reader.getById.mockResolvedValue({
        ...baseUser,
        verificationCodeExpires: new Date(Date.now() - 60 * 60 * 1000),
      });

      await expect(
        useCase.execute('user-1', 'ABC123', tracking),
      ).rejects.toThrow(BadRequestException);
      expect(updater.update).not.toHaveBeenCalled();
    });
  });
});