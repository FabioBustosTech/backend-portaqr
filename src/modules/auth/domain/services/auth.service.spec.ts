import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AuthService } from './auth.service';
import { JwtAuthService } from './jwt.service';
import { PasswordService } from '../../../users/domain/services/password.service';
import { GetUserUseCase } from '../../../users/application/use-cases/get-user.usecase';
import { UpdateUserUseCase } from '../../../users/application/use-cases/update-user.usecase';
import { IncrementTokenVersionUseCase } from '../../../users/application/use-cases/increment-token-version.usecase';
import { TraceService } from '../../../../common/services/trace.service';
import type { User } from '../../../users/domain/entities/user.entity';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';

describe('AuthService', () => {
  let service: AuthService;
  let jwtAuthService: jest.Mocked<JwtAuthService>;
  let passwordService: jest.Mocked<PasswordService>;
  let getUserUseCase: jest.Mocked<GetUserUseCase>;
  let updateUserUseCase: jest.Mocked<UpdateUserUseCase>;
  let incrementTokenVersionUseCase: jest.Mocked<IncrementTokenVersionUseCase>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const validObjectId = new Types.ObjectId().toString();

  const mockUser: User = {
    id: validObjectId,
    email: 'test@test.com',
    userName: 'testuser',
    password: 'hashed-password',
    firstName: 'Test',
    paternalLastName: 'Apellido',
    maternalLastName: 'Apellido2',
    role: 'user',
    isEmailVerified: true,
  };

  const mockTokens = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtAuthService,
          useValue: {
            generateTokens: jest.fn(),
            verifyRefreshToken: jest.fn(),
            verifyToken: jest.fn(),
            decodeToken: jest.fn(),
          },
        },
        {
          provide: PasswordService,
          useValue: {
            comparePassword: jest.fn(),
            hashPassword: jest.fn(),
          },
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
          useValue: {
            execute: jest.fn(),
            updateLastLogin: jest.fn(),
          },
        },
        {
          provide: IncrementTokenVersionUseCase,
          useValue: {
            execute: jest.fn(),
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

    service = module.get<AuthService>(AuthService);
    jwtAuthService = module.get(JwtAuthService);
    passwordService = module.get(PasswordService);
    getUserUseCase = module.get(GetUserUseCase);
    updateUserUseCase = module.get(UpdateUserUseCase);
    incrementTokenVersionUseCase = module.get(IncrementTokenVersionUseCase);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('debe retornar el usuario (sin password) y los tokens cuando las credenciales son válidas', async () => {
      getUserUseCase.executeByUsername.mockResolvedValue(mockUser);
      passwordService.comparePassword.mockResolvedValue(true);
      jwtAuthService.generateTokens.mockResolvedValue(mockTokens);

      const result = await service.login(
        { username: 'testuser', password: 'password123' },
        tracking,
      );

      expect(getUserUseCase.executeByUsername).toHaveBeenCalledWith(
        'testuser',
        tracking,
      );
      expect(passwordService.comparePassword).toHaveBeenCalledWith(
        'password123',
        'hashed-password',
      );
      expect(updateUserUseCase.updateLastLogin).toHaveBeenCalledWith(
        mockUser.id,
        tracking,
      );
      expect(jwtAuthService.generateTokens).toHaveBeenCalledWith(mockUser);
      expect(result.user).not.toHaveProperty('password');
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('debe lanzar UnauthorizedException si el usuario no existe', async () => {
      getUserUseCase.executeByUsername.mockResolvedValue(null);

      await expect(
        service.login({ username: 'nobody', password: 'password123' }, tracking),
      ).rejects.toThrow(UnauthorizedException);
      expect(passwordService.comparePassword).not.toHaveBeenCalled();
    });

    it('debe lanzar UnauthorizedException si el usuario no tiene password', async () => {
      getUserUseCase.executeByUsername.mockResolvedValue({
        ...mockUser,
        password: undefined,
      });

      await expect(
        service.login({ username: 'testuser', password: 'password123' }, tracking),
      ).rejects.toThrow(UnauthorizedException);
      expect(passwordService.comparePassword).not.toHaveBeenCalled();
    });

    it('debe lanzar UnauthorizedException si la contraseña es incorrecta', async () => {
      getUserUseCase.executeByUsername.mockResolvedValue(mockUser);
      passwordService.comparePassword.mockResolvedValue(false);

      await expect(
        service.login({ username: 'testuser', password: 'wrong' }, tracking),
      ).rejects.toThrow(UnauthorizedException);
      expect(jwtAuthService.generateTokens).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('debe generar nuevos tokens cuando el refresh token es válido', async () => {
      jwtAuthService.verifyRefreshToken.mockReturnValue({
        sub: validObjectId,
        email: mockUser.email,
        userName: mockUser.userName,
        role: mockUser.role,
        isEmailVerified: true,
      });
      getUserUseCase.execute.mockResolvedValue(mockUser);
      jwtAuthService.generateTokens.mockResolvedValue(mockTokens);

      const result = await service.refreshToken('refresh-token', tracking);

      expect(getUserUseCase.execute).toHaveBeenCalledWith(validObjectId, tracking);
      expect(result).toEqual(mockTokens);
    });

    it('debe lanzar UnauthorizedException si el sub no es un ObjectId válido', async () => {
      jwtAuthService.verifyRefreshToken.mockReturnValue({
        sub: 'not-a-valid-object-id',
        email: mockUser.email,
        userName: mockUser.userName,
        role: mockUser.role,
        isEmailVerified: true,
      });

      await expect(service.refreshToken('bad-token', tracking)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(getUserUseCase.execute).not.toHaveBeenCalled();
    });

    it('debe propagar UnauthorizedException si verifyRefreshToken falla', async () => {
      jwtAuthService.verifyRefreshToken.mockImplementation(() => {
        throw new UnauthorizedException('Token de refresco inválido o expirado');
      });

      await expect(service.refreshToken('bad-token', tracking)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debe lanzar UnauthorizedException si el tokenVersion del refresh token no coincide (logout)', async () => {
      jwtAuthService.verifyRefreshToken.mockReturnValue({
        sub: validObjectId,
        email: mockUser.email,
        userName: mockUser.userName,
        role: mockUser.role,
        isEmailVerified: true,
        tokenVersion: 0,
      });
      getUserUseCase.execute.mockResolvedValue({ ...mockUser, tokenVersion: 1 });

      await expect(service.refreshToken('stale-refresh', tracking)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtAuthService.generateTokens).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('debe incrementar el tokenVersion del usuario y retornar success', async () => {
      incrementTokenVersionUseCase.execute.mockResolvedValue(undefined);

      const result = await service.logout(validObjectId, tracking);

      expect(incrementTokenVersionUseCase.execute).toHaveBeenCalledWith(
        validObjectId,
        tracking,
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('getProfile', () => {
    it('debe retornar el perfil sin password', async () => {
      getUserUseCase.execute.mockResolvedValue(mockUser);

      const result = await service.getProfile(validObjectId, tracking);

      expect(getUserUseCase.execute).toHaveBeenCalledWith(validObjectId, tracking);
      expect(result).not.toHaveProperty('password');
      expect(result.id).toBe(validObjectId);
    });
  });

  describe('validateUser', () => {
    it('debe retornar el usuario cuando existe', async () => {
      getUserUseCase.execute.mockResolvedValue(mockUser);

      const result = await service.validateUser({
        sub: validObjectId,
        email: mockUser.email,
        userName: mockUser.userName,
        role: mockUser.role,
        isEmailVerified: true,
      });

      expect(result).toEqual(mockUser);
    });

    it('debe retornar null si ocurre un error al buscar el usuario', async () => {
      getUserUseCase.execute.mockRejectedValue(new Error('DB down'));

      const result = await service.validateUser({
        sub: validObjectId,
        email: mockUser.email,
        userName: mockUser.userName,
        role: mockUser.role,
        isEmailVerified: true,
      });

      expect(result).toBeNull();
    });
  });
});
