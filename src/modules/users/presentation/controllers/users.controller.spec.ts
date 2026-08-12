import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { CreateUserUseCase } from '../../application/use-cases/create-user.usecase';
import { GetAllUserUseCase } from '../../application/use-cases/get-all-user.usecase';
import { GetUserUseCase } from '../../application/use-cases/get-user.usecase';
import { UpdateUserUseCase } from '../../application/use-cases/update-user.usecase';
import { DeleteUserUseCase } from '../../application/use-cases/delete-user.usecase';
import { VerifyEmailUseCase } from '../../application/use-cases/verify-email.usecase';
import { ResendVerificationCodeUseCase } from '../../application/use-cases/resend-verification-code.usecase';
import { ForgotPasswordUseCase } from '../../application/use-cases/forgot-password.usecase';
import { ResetPasswordUseCase } from '../../application/use-cases/reset-password.usecase';
import { ChangePasswordUseCase } from '../../application/use-cases/change-password.usecase';
import type { User } from '../../domain/entities/user.entity';
import type { PaginatedResult } from '../../../../common/dto/pagination.dto';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';

interface AuthenticatedUser {
  id: string;
  role: string;
}

describe('UsersController', () => {
  let controller: UsersController;
  let createUserUseCase: jest.Mocked<CreateUserUseCase>;
  let getAllUserUseCase: jest.Mocked<GetAllUserUseCase>;
  let getUserUseCase: jest.Mocked<GetUserUseCase>;
  let updateUserUseCase: jest.Mocked<UpdateUserUseCase>;
  let deleteUserUseCase: jest.Mocked<DeleteUserUseCase>;
  let verifyEmailUseCase: jest.Mocked<VerifyEmailUseCase>;
  let resendVerificationCodeUseCase: jest.Mocked<ResendVerificationCodeUseCase>;
  let forgotPasswordUseCase: jest.Mocked<ForgotPasswordUseCase>;
  let resetPasswordUseCase: jest.Mocked<ResetPasswordUseCase>;
  let changePasswordUseCase: jest.Mocked<ChangePasswordUseCase>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const mockUser: User = {
    id: 'user-1',
    email: 'test@test.com',
    userName: 'testuser',
    password: 'hashed-password',
    firstName: 'Test',
    paternalLastName: 'Apellido',
    maternalLastName: 'Apellido2',
    role: 'user',
    isEmailVerified: true,
  };

  const paginatedResult: PaginatedResult<User> = {
    data: [mockUser],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  };

  const createUserDto = {
    email: 'nuevo@test.com',
    userName: 'nuevouser',
    password: 'password123',
    firstName: 'Nuevo',
    paternalLastName: 'Pérez',
    maternalLastName: 'Gómez',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: CreateUserUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetAllUserUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetUserUseCase,
          useValue: {
            execute: jest.fn(),
            executeByUsername: jest.fn(),
            executeByEmail: jest.fn(),
            executeByVerificationCode: jest.fn(),
            executeByPasswordResetCode: jest.fn(),
          },
        },
        {
          provide: UpdateUserUseCase,
          useValue: { execute: jest.fn(), updateLastLogin: jest.fn() },
        },
        {
          provide: DeleteUserUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: VerifyEmailUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ResendVerificationCodeUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ForgotPasswordUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ResetPasswordUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ChangePasswordUseCase,
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

    controller = module.get(UsersController);
    createUserUseCase = module.get(CreateUserUseCase);
    getAllUserUseCase = module.get(GetAllUserUseCase);
    getUserUseCase = module.get(GetUserUseCase);
    updateUserUseCase = module.get(UpdateUserUseCase);
    deleteUserUseCase = module.get(DeleteUserUseCase);
    verifyEmailUseCase = module.get(VerifyEmailUseCase);
    resendVerificationCodeUseCase = module.get(ResendVerificationCodeUseCase);
    forgotPasswordUseCase = module.get(ForgotPasswordUseCase);
    resetPasswordUseCase = module.get(ResetPasswordUseCase);
    changePasswordUseCase = module.get(ChangePasswordUseCase);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('verifyEmail', () => {
    it('debe delegar en el use-case y retornar mensaje de éxito', async () => {
      verifyEmailUseCase.execute.mockResolvedValue(undefined);

      const result = await controller.verifyEmail('user-1', 'ABC123', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'POST /users/:id/verify-email',
        { id: 'user-1' },
      );
      expect(verifyEmailUseCase.execute).toHaveBeenCalledWith(
        'user-1',
        'ABC123',
        tracking,
      );
      expect(result).toEqual({ message: 'Email verificado exitosamente' });
    });
  });

  describe('resendVerificationCode', () => {
    it('debe delegar en el use-case y retornar mensaje de éxito', async () => {
      resendVerificationCodeUseCase.execute.mockResolvedValue(undefined);

      const result = await controller.resendVerificationCode('user-1', tracking);

      expect(resendVerificationCodeUseCase.execute).toHaveBeenCalledWith(
        'user-1',
        tracking,
      );
      expect(result).toEqual({
        message: 'CÃ³digo de verificaciÃ³n reenviado exitosamente',
      });
    });
  });

  describe('forgotPassword', () => {
    it('debe delegar en el use-case y retornar mensaje de éxito', async () => {
      forgotPasswordUseCase.execute.mockResolvedValue(undefined);

      const result = await controller.forgotPassword('test@test.com', tracking);

      expect(forgotPasswordUseCase.execute).toHaveBeenCalledWith(
        'test@test.com',
        tracking,
      );
      expect(result).toEqual({
        message: 'CÃ³digo de recuperaciÃ³n enviado exitosamente',
      });
    });
  });

  describe('resetPassword', () => {
    it('debe delegar en el use-case y retornar mensaje de éxito', async () => {
      resetPasswordUseCase.execute.mockResolvedValue(undefined);

      const result = await controller.resetPassword(
        'test@test.com',
        'RESET123',
        'nueva123',
        tracking,
      );

      expect(resetPasswordUseCase.execute).toHaveBeenCalledWith(
        'test@test.com',
        'RESET123',
        'nueva123',
        tracking,
      );
      expect(result).toEqual({
        message: 'ContraseÃ±a actualizada exitosamente',
      });
    });
  });

  describe('create', () => {
    it('debe delegar en el use-case y retornar el usuario creado', async () => {
      createUserUseCase.execute.mockResolvedValue(mockUser);

      const result = await controller.create(createUserDto, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'POST /users',
        { email: createUserDto.email },
      );
      expect(createUserUseCase.execute).toHaveBeenCalledWith(
        createUserDto,
        tracking,
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe('checkUserNameExists', () => {
    it('debe retornar exists true si el username existe', async () => {
      getUserUseCase.executeByUsername.mockResolvedValue(mockUser);

      const result = await controller.checkUserNameExists('testuser', tracking);

      expect(getUserUseCase.executeByUsername).toHaveBeenCalledWith(
        'testuser',
        tracking,
      );
      expect(result).toEqual({ exists: true });
    });

    it('debe retornar exists false si el username no existe', async () => {
      getUserUseCase.executeByUsername.mockResolvedValue(null);

      const result = await controller.checkUserNameExists('nadie', tracking);

      expect(result).toEqual({ exists: false });
    });
  });

  describe('checkEmailExists', () => {
    it('debe retornar exists true si el email existe', async () => {
      getUserUseCase.executeByEmail.mockResolvedValue(mockUser);

      const result = await controller.checkEmailExists('test@test.com', tracking);

      expect(getUserUseCase.executeByEmail).toHaveBeenCalledWith(
        'test@test.com',
        tracking,
      );
      expect(result).toEqual({ exists: true });
    });

    it('debe retornar exists false si el email no existe', async () => {
      getUserUseCase.executeByEmail.mockResolvedValue(null);

      const result = await controller.checkEmailExists('nadie@test.com', tracking);

      expect(result).toEqual({ exists: false });
    });
  });

  describe('findByUsername', () => {
    it('debe retornar el usuario sin password si existe', async () => {
      getUserUseCase.executeByUsername.mockResolvedValue(mockUser);

      const result = await controller.findByUsername('testuser', tracking);

      expect(getUserUseCase.executeByUsername).toHaveBeenCalledWith(
        'testuser',
        tracking,
      );
      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('userName', 'testuser');
    });

    it('debe retornar null si el usuario no existe', async () => {
      getUserUseCase.executeByUsername.mockResolvedValue(null);

      const result = await controller.findByUsername('nadie', tracking);

      expect(result).toBeNull();
    });
  });

  describe('findPaginatedByUser', () => {
    it('debe delegar en el use-case con los parámetros de query', async () => {
      getAllUserUseCase.execute.mockResolvedValue(paginatedResult);

      const result = await controller.findPaginatedByUser(2, 25, 'juan', tracking);

      expect(getAllUserUseCase.execute).toHaveBeenCalledWith(2, 25, 'juan', tracking);
      expect(result).toEqual(paginatedResult);
    });

    it('debe usar valores por defecto si no se envían queries', async () => {
      getAllUserUseCase.execute.mockResolvedValue(paginatedResult);

      await controller.findPaginatedByUser(undefined, undefined, undefined, tracking);

      expect(getAllUserUseCase.execute).toHaveBeenCalledWith(1, 10, '', tracking);
    });
  });

  describe('findAll', () => {
    it('debe retornar solo la lista de datos con paginación 1 y 100', async () => {
      getAllUserUseCase.execute.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(tracking);

      expect(getAllUserUseCase.execute).toHaveBeenCalledWith(
        1,
        100,
        undefined,
        tracking,
      );
      expect(result).toEqual([mockUser]);
    });
  });

  describe('findOne', () => {
    it('debe retornar el usuario sin password', async () => {
      getUserUseCase.execute.mockResolvedValue(mockUser);

      const result = await controller.findOne('user-1', tracking);

      expect(getUserUseCase.execute).toHaveBeenCalledWith('user-1', tracking);
      expect(result).not.toHaveProperty('password');
      expect(result.id).toBe('user-1');
    });
  });

  describe('changePassword', () => {
    const changePasswordDto = {
      currentPassword: 'password123',
      newPassword: 'newpassword123',
    };

    it('debe lanzar UnauthorizedException si el usuario no está autenticado', async () => {
      await expect(
        controller.changePassword('user-1', changePasswordDto, null, tracking),
      ).rejects.toThrow(UnauthorizedException);
      expect(changePasswordUseCase.execute).not.toHaveBeenCalled();
    });

    it('debe lanzar UnauthorizedException si intenta cambiar la contraseña de otro usuario', async () => {
      const otherUser: AuthenticatedUser = { id: 'user-2', role: 'user' };

      await expect(
        controller.changePassword('user-1', changePasswordDto, otherUser, tracking),
      ).rejects.toThrow(UnauthorizedException);
      expect(changePasswordUseCase.execute).not.toHaveBeenCalled();
    });

    it('debe delegar en el use-case cuando el usuario es el propietario', async () => {
      const authenticatedUser: AuthenticatedUser = { id: 'user-1', role: 'user' };
      changePasswordUseCase.execute.mockResolvedValue(undefined);

      await controller.changePassword(
        'user-1',
        changePasswordDto,
        authenticatedUser,
        tracking,
      );

      expect(changePasswordUseCase.execute).toHaveBeenCalledWith(
        'user-1',
        changePasswordDto,
        tracking,
      );
    });

    it('debe permitir que un admin cambie la contraseña del propio id', async () => {
      const admin: AuthenticatedUser = { id: 'admin-1', role: 'admin' };
      changePasswordUseCase.execute.mockResolvedValue(undefined);

      await controller.changePassword(
        'admin-1',
        changePasswordDto,
        admin,
        tracking,
      );

      expect(changePasswordUseCase.execute).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    // Ids ObjectId válidos (24 hex) — la validación de ObjectId del controller
    // rechaza strings tipo 'user-1' con 400 ANTES del ownership check.
    const OWNER_ID = '507f1f77bcf86cd799439011';
    const OTHER_ID = '507f1f77bcf86cd799439012';

    it('debe delegar en el use-case y retornar el usuario actualizado', async () => {
      const updatedUser: User = { ...mockUser, firstName: 'NuevoNombre' };
      const updateUserDto = { firstName: 'NuevoNombre' };
      updateUserUseCase.execute.mockResolvedValue(updatedUser);

      const result = await controller.update(
        OWNER_ID,
        updateUserDto,
        { id: OWNER_ID, role: 'user' },
        tracking,
      );

      expect(updateUserUseCase.execute).toHaveBeenCalledWith(
        OWNER_ID,
        updateUserDto,
        { id: OWNER_ID, role: 'user' },
        tracking,
      );
      expect(result).toEqual(updatedUser);
    });

    it('SPEC-009 A1: 403 si el autenticado no es el dueño (rol user)', async () => {
      await expect(
        controller.update(
          OWNER_ID,
          { firstName: 'X' },
          { id: OTHER_ID, role: 'user' },
          tracking,
        ),
      ).rejects.toThrow('No tiene permiso para modificar este usuario.');
      expect(updateUserUseCase.execute).not.toHaveBeenCalled();
    });

    it('SPEC-009 A1: admin puede actualizar a cualquier usuario (bypass)', async () => {
      const updatedUser: User = { ...mockUser, firstName: 'AdminEdit' };
      updateUserUseCase.execute.mockResolvedValue(updatedUser);

      const result = await controller.update(
        OWNER_ID,
        { firstName: 'AdminEdit' },
        { id: '507f1f77bcf86cd799439099', role: 'admin' },
        tracking,
      );
      expect(result).toEqual(updatedUser);
      expect(updateUserUseCase.execute).toHaveBeenCalledWith(
        OWNER_ID,
        { firstName: 'AdminEdit' },
        { id: '507f1f77bcf86cd799439099', role: 'admin' },
        tracking,
      );
    });

    it('SPEC-009 A1: ObjectId inválido → 400 (no llega al use-case)', async () => {
      await expect(
        controller.update(
          'id-no-valid0',
          { firstName: 'X' },
          { id: OWNER_ID, role: 'user' },
          tracking,
        ),
      ).rejects.toThrow('ID de usuario inválido.');
      expect(updateUserUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('debe delegar en el use-case', async () => {
      deleteUserUseCase.execute.mockResolvedValue(undefined);

      const result = await controller.remove('user-1', tracking);

      expect(deleteUserUseCase.execute).toHaveBeenCalledWith('user-1', tracking);
      expect(result).toBeUndefined();
    });
  });
});