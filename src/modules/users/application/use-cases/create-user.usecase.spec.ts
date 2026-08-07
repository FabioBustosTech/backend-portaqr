import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateUserUseCase } from './create-user.usecase';
import {
  USER_CREATE_PORT,
  USER_GET_PORT,
  USER_CHECK_PORT,
  USER_UPDATE_PORT,
} from '../../domain/constants/user.tokens';
import type { ICanCreateUser, ICanUpdateUser, ICanCheckUser } from '../../domain/ports/queries/create-user.port';
import type { ICanGetUser } from '../../domain/ports/queries/get-user.port';
import type { User } from '../../domain/entities/user.entity';
import { UserValidationRules } from '../../domain/validators/user-validation.rules';
import { PasswordService } from '../../domain/services/password.service';
import { EmailService } from '../../../../shared/email/email.service';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import type { CreateUserDto } from '../dto/create-user.dto';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let creator: jest.Mocked<ICanCreateUser>;
  let reader: jest.Mocked<ICanGetUser>;
  let checker: jest.Mocked<ICanCheckUser>;
  let updater: jest.Mocked<ICanUpdateUser>;
  let passwordService: jest.Mocked<PasswordService>;
  let traceService: jest.Mocked<TraceService>;
  let emailService: jest.Mocked<EmailService>;
  let configService: { get: jest.Mock };

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const dto: CreateUserDto = {
    email: 'Juan@Ejemplo.COM',
    userName: '  juanperez ',
    password: 'password123',
    firstName: ' Juan ',
    paternalLastName: ' Pérez ',
    maternalLastName: ' Gómez ',
    phone: '123456789',
  };

  const createdUser: User = {
    id: 'user-1',
    email: 'juan@ejemplo.com',
    userName: 'juan',
    password: 'hashed-password',
    firstName: 'Juan',
    paternalLastName: 'Pérez',
    maternalLastName: 'Gómez',
    role: 'user',
    isEmailVerified: false,
    phone: '123456789',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserUseCase,
        {
          provide: USER_CREATE_PORT,
          useValue: {
            create: jest.fn(),
            createAdmin: jest.fn(),
          },
        },
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
          provide: USER_CHECK_PORT,
          useValue: {
            checkUserNameExists: jest.fn(),
            checkEmailExists: jest.fn(),
          },
        },
        {
          provide: USER_UPDATE_PORT,
          useValue: {
            update: jest.fn(),
            updateLastLogin: jest.fn(),
          },
        },
        UserValidationRules,
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

    useCase = module.get(CreateUserUseCase);
    creator = module.get(USER_CREATE_PORT) as jest.Mocked<ICanCreateUser>;
    reader = module.get(USER_GET_PORT) as jest.Mocked<ICanGetUser>;
    checker = module.get(USER_CHECK_PORT) as jest.Mocked<ICanCheckUser>;
    updater = module.get(USER_UPDATE_PORT) as jest.Mocked<ICanUpdateUser>;
    passwordService = module.get(PasswordService);
    traceService = module.get(TraceService);
    emailService = module.get(EmailService);
    configService = module.get(ConfigService) as { get: jest.Mock };
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe crear el usuario normalizado, enviar email de verificación y retornar sin password', async () => {
      checker.checkEmailExists.mockResolvedValue(false);
      checker.checkUserNameExists.mockResolvedValue(false);
      passwordService.hashPassword.mockResolvedValue('hashed-password');
      creator.create.mockResolvedValue(createdUser);
      updater.update.mockResolvedValue(createdUser);
      reader.getById.mockResolvedValue(createdUser);
      emailService.sendVerificationEmail.mockResolvedValue(undefined);
      configService.get.mockReturnValue('3600');

      const result = await useCase.execute(dto, tracking);

      expect(checker.checkEmailExists).toHaveBeenCalledWith(
        'juan@ejemplo.com',
        tracking,
      );
      expect(checker.checkUserNameExists).toHaveBeenCalledWith('juanperez', tracking);
      expect(passwordService.hashPassword).toHaveBeenCalledWith('password123');

      const usuarioCreado = creator.create.mock.calls[0][0] as User;
      expect(usuarioCreado.email).toBe('juan@ejemplo.com');
      expect(usuarioCreado.userName).toBe('juanperez');
      expect(usuarioCreado.firstName).toBe('Juan');
      expect(usuarioCreado.role).toBe('user');
      expect(usuarioCreado.isEmailVerified).toBe(false);

      expect(updater.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          verificationCode: expect.any(String),
          verificationCodeExpires: expect.any(Date),
        }),
        tracking,
      );
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        'juan@ejemplo.com',
        'user-1',
        expect.any(String),
      );

      expect(result).not.toHaveProperty('password');
      expect(result.id).toBe('user-1');
    });

    it('debe lanzar ConflictException cuando la validación falla', async () => {
      const dtoInvalido: CreateUserDto = {
        email: 'correo-invalido',
        userName: '',
        password: '123',
        firstName: '',
        paternalLastName: '',
        maternalLastName: '',
      };

      await expect(useCase.execute(dtoInvalido, tracking)).rejects.toThrow(
        ConflictException,
      );
      expect(checker.checkEmailExists).not.toHaveBeenCalled();
      expect(creator.create).not.toHaveBeenCalled();
    });

    it('debe lanzar ConflictException si el email ya está registrado', async () => {
      checker.checkEmailExists.mockResolvedValue(true);

      await expect(useCase.execute(dto, tracking)).rejects.toThrow(
        ConflictException,
      );
      expect(traceService.warn).toHaveBeenCalled();
      expect(creator.create).not.toHaveBeenCalled();
    });

    it('debe lanzar ConflictException si el username ya está en uso', async () => {
      checker.checkEmailExists.mockResolvedValue(false);
      checker.checkUserNameExists.mockResolvedValue(true);

      await expect(useCase.execute(dto, tracking)).rejects.toThrow(
        ConflictException,
      );
      expect(creator.create).not.toHaveBeenCalled();
    });

    it('debe usar 3600 segundos de expiración por defecto si no hay configuración', async () => {
      checker.checkEmailExists.mockResolvedValue(false);
      checker.checkUserNameExists.mockResolvedValue(false);
      passwordService.hashPassword.mockResolvedValue('hashed-password');
      creator.create.mockResolvedValue(createdUser);
      updater.update.mockResolvedValue(createdUser);
      reader.getById.mockResolvedValue(createdUser);
      emailService.sendVerificationEmail.mockResolvedValue(undefined);
      configService.get.mockReturnValue(undefined);

      const result = await useCase.execute(dto, tracking);

      const updateArg = updater.update.mock.calls[0][1] as {
        verificationCodeExpires: Date;
      };
      const diffSeconds =
        (updateArg.verificationCodeExpires.getTime() - Date.now()) / 1000;
      expect(diffSeconds).toBeGreaterThan(3590);
      expect(diffSeconds).toBeLessThanOrEqual(3600);
      expect(result.id).toBe('user-1');
    });

    it('debe omitir el envío del email si el usuario no se encuentra tras actualizar', async () => {
      checker.checkEmailExists.mockResolvedValue(false);
      checker.checkUserNameExists.mockResolvedValue(false);
      passwordService.hashPassword.mockResolvedValue('hashed-password');
      creator.create.mockResolvedValue(createdUser);
      updater.update.mockResolvedValue(createdUser);
      reader.getById.mockResolvedValue(null);
      configService.get.mockReturnValue('3600');

      const result = await useCase.execute(dto, tracking);

      expect(updater.update).toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
      expect(result.id).toBe('user-1');
    });

    it('debe retornar el usuario creado aunque falle el envío del email de verificación', async () => {
      checker.checkEmailExists.mockResolvedValue(false);
      checker.checkUserNameExists.mockResolvedValue(false);
      passwordService.hashPassword.mockResolvedValue('hashed-password');
      creator.create.mockResolvedValue(createdUser);
      updater.update.mockResolvedValue(createdUser);
      reader.getById.mockResolvedValue(createdUser);
      emailService.sendVerificationEmail.mockRejectedValue(
        new Error('SMTP caído'),
      );
      configService.get.mockReturnValue('3600');

      const result = await useCase.execute(dto, tracking);

      expect(result.id).toBe('user-1');
      expect(result).not.toHaveProperty('password');
    });
  });
});