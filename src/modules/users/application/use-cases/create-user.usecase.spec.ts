import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateUserUseCase } from './create-user.usecase';
import { USER_CREATE_PORT } from '../../domain/constants/user.tokens';
import type { ICanCreateUser } from '../../domain/ports/queries/create-user.port';
import type { User } from '../../domain/entities/user.entity';
import { UserValidationRules } from '../../domain/validators/user-validation.rules';
import { PasswordService } from '../../domain/services/password.service';
import { EmailService } from '../../../../shared/email/email.service';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import type { CreateUserDto } from '../dto/create-user.dto';

/** Simula el error E11000 de MongoDB */
const createDuplicateKeyError = (keyPattern: Record<string, unknown> = { email: 1 }) =>
  Object.assign(new Error('E11000 duplicate key error'), { code: 11000, keyPattern });

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let creator: jest.Mocked<ICanCreateUser>;
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
    userName: 'juanperez',
    password: 'hashed-password',
    firstName: 'Juan',
    paternalLastName: 'Pérez',
    maternalLastName: 'Gómez',
    role: 'user',
    isEmailVerified: false,
    phone: '123456789',
    verificationCode: 'ABC123',
    verificationCodeExpires: new Date(),
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
    passwordService = module.get(PasswordService);
    traceService = module.get(TraceService);
    emailService = module.get(EmailService);
    configService = module.get(ConfigService) as { get: jest.Mock };
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe crear el usuario en 1 round-trip (sin pre-checks ni update/getById) y enviar email', async () => {
      passwordService.hashPassword.mockResolvedValue('hashed-password');
      creator.create.mockResolvedValue(createdUser);
      emailService.sendVerificationEmail.mockResolvedValue(undefined);
      configService.get.mockReturnValue('3600');

      const result = await useCase.execute(dto, tracking);

      // Sin pre-checks: 1 sola llamada a BD (create)
      expect(creator.create).toHaveBeenCalledTimes(1);
      expect(passwordService.hashPassword).toHaveBeenCalledWith('password123');

      const usuarioCreado = creator.create.mock.calls[0][0] as User;
      expect(usuarioCreado.email).toBe('juan@ejemplo.com');
      expect(usuarioCreado.userName).toBe('juanperez');
      expect(usuarioCreado.firstName).toBe('Juan');
      expect(usuarioCreado.role).toBe('user');
      expect(usuarioCreado.isEmailVerified).toBe(false);
      // verificationCode incluido en el insert (no en update posterior)
      expect(usuarioCreado.verificationCode).toEqual(expect.any(String));
      expect(usuarioCreado.verificationCodeExpires).toBeInstanceOf(Date);

      // Email con el doc retornado (sin getById)
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
      expect(creator.create).not.toHaveBeenCalled();
    });

    it('debe lanzar ConflictException si el email ya está registrado (E11000 → 409)', async () => {
      passwordService.hashPassword.mockResolvedValue('hashed-password');
      creator.create.mockRejectedValue(createDuplicateKeyError({ email: 1 }));

      await expect(useCase.execute(dto, tracking)).rejects.toThrow(
        'El correo electrónico ya está registrado',
      );
      expect(traceService.warn).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'CreateUserUseCase - duplicado (E11000)',
        { email: 'juan@ejemplo.com' },
      );
      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('debe lanzar ConflictException si el username ya está en uso (E11000 con keyPattern userName)', async () => {
      passwordService.hashPassword.mockResolvedValue('hashed-password');
      creator.create.mockRejectedValue(createDuplicateKeyError({ userName: 1 }));

      await expect(useCase.execute(dto, tracking)).rejects.toThrow(
        'El nombre de usuario ya está en uso',
      );
    });

    it('debe usar 3600 segundos de expiración por defecto si no hay configuración', async () => {
      passwordService.hashPassword.mockResolvedValue('hashed-password');
      creator.create.mockResolvedValue(createdUser);
      emailService.sendVerificationEmail.mockResolvedValue(undefined);
      configService.get.mockReturnValue(undefined);

      const result = await useCase.execute(dto, tracking);

      const creado = creator.create.mock.calls[0][0] as User;
      const diffSeconds =
        ((creado.verificationCodeExpires as Date).getTime() - Date.now()) / 1000;
      expect(diffSeconds).toBeGreaterThan(3590);
      expect(diffSeconds).toBeLessThanOrEqual(3600);
      expect(result.id).toBe('user-1');
    });

    it('debe propagar errores que no son de clave duplicada', async () => {
      passwordService.hashPassword.mockResolvedValue('hashed-password');
      creator.create.mockRejectedValue(new Error('DB down'));

      await expect(useCase.execute(dto, tracking)).rejects.toThrow('DB down');
    });

    it('debe retornar el usuario creado aunque falle el envío del email de verificación', async () => {
      passwordService.hashPassword.mockResolvedValue('hashed-password');
      creator.create.mockResolvedValue(createdUser);
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
