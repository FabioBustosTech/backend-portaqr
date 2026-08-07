import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ForgotPasswordUseCase } from './forgot-password.usecase';
import { USER_GET_PORT, USER_UPDATE_PORT } from '../../domain/constants/user.tokens';
import type { ICanGetUser } from '../../domain/ports/queries/get-user.port';
import type { ICanUpdateUser } from '../../domain/ports/queries/create-user.port';
import type { User } from '../../domain/entities/user.entity';
import { EmailService } from '../../../../shared/email/email.service';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';

describe('ForgotPasswordUseCase', () => {
  let useCase: ForgotPasswordUseCase;
  let reader: jest.Mocked<ICanGetUser>;
  let updater: jest.Mocked<ICanUpdateUser>;
  let traceService: jest.Mocked<TraceService>;
  let emailService: jest.Mocked<EmailService>;
  let configService: { get: jest.Mock };

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const mockUser: User = {
    id: 'user-1',
    email: 'test@test.com',
    userName: 'testuser',
    firstName: 'Test',
    paternalLastName: 'Apellido',
    maternalLastName: 'Apellido2',
    role: 'user',
    isEmailVerified: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForgotPasswordUseCase,
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
        {
          provide: EmailService,
          useValue: {
            sendVerificationEmail: jest.fn(),
            sendPasswordResetEmail: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(ForgotPasswordUseCase);
    reader = module.get(USER_GET_PORT) as jest.Mocked<ICanGetUser>;
    updater = module.get(USER_UPDATE_PORT) as jest.Mocked<ICanUpdateUser>;
    traceService = module.get(TraceService);
    emailService = module.get(EmailService);
    configService = module.get(ConfigService) as { get: jest.Mock };
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe generar un código de reset, actualizar el usuario y enviar el email', async () => {
      reader.getByEmail.mockResolvedValue(mockUser);
      updater.update.mockResolvedValue(mockUser);
      emailService.sendPasswordResetEmail.mockResolvedValue(undefined);
      configService.get.mockReturnValue('3600');

      await useCase.execute('test@test.com', tracking);

      expect(reader.getByEmail).toHaveBeenCalledWith('test@test.com', tracking);
      expect(updater.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          passwordResetCode: expect.any(String),
          passwordResetExpires: expect.any(Date),
        }),
        tracking,
      );
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@test.com',
        expect.any(String),
        'Test Apellido Apellido2',
      );
      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        expect.stringContaining('ForgotPasswordUseCase'),
        { email: 'test@test.com' },
      );
    });

    it('debe usar 3600 segundos por defecto si no hay configuración de expiración', async () => {
      reader.getByEmail.mockResolvedValue(mockUser);
      updater.update.mockResolvedValue(mockUser);
      emailService.sendPasswordResetEmail.mockResolvedValue(undefined);
      configService.get.mockReturnValue(undefined);

      await useCase.execute('test@test.com', tracking);

      const updateArg = updater.update.mock.calls[0][1] as {
        passwordResetExpires: Date;
      };
      const diffSeconds =
        (updateArg.passwordResetExpires.getTime() - Date.now()) / 1000;
      expect(diffSeconds).toBeGreaterThan(3590);
      expect(diffSeconds).toBeLessThanOrEqual(3600);
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      reader.getByEmail.mockResolvedValue(null);

      await expect(
        useCase.execute('nadie@test.com', tracking),
      ).rejects.toThrow(NotFoundException);
      expect(updater.update).not.toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });
});