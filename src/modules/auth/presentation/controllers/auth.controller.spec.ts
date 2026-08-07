import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../../domain/services/auth.service';
import { TraceService } from '../../../../common/services/trace.service';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            refreshToken: jest.fn(),
            getProfile: jest.fn(),
            logout: jest.fn(),
            validateUser: jest.fn(),
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

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('debe delegar al AuthService y retornar la respuesta', async () => {
      const loginDto = { username: 'testuser', password: 'password123' };
      const expected = {
        user: { id: 'user-1' },
        accessToken: 'at',
        refreshToken: 'rt',
      };
      authService.login.mockResolvedValue(expected as never);

      const result = await controller.login(loginDto, tracking);

      expect(authService.login).toHaveBeenCalledWith(loginDto, tracking);
      expect(result).toEqual(expected);
    });
  });

  describe('refreshToken', () => {
    it('debe delegar el refresh token al AuthService', async () => {
      const dto = { refreshToken: 'refresh-token' };
      const expected = { accessToken: 'at', refreshToken: 'rt' };
      authService.refreshToken.mockResolvedValue(expected as never);

      const result = await controller.refreshToken(dto, tracking);

      expect(authService.refreshToken).toHaveBeenCalledWith(
        'refresh-token',
        tracking,
      );
      expect(result).toEqual(expected);
    });
  });

  describe('getProfile', () => {
    it('debe retornar el perfil del usuario del request', async () => {
      const req = { user: { id: 'user-1' } };
      const expected = { id: 'user-1', email: 'test@test.com' };
      authService.getProfile.mockResolvedValue(expected as never);

      const result = await controller.getProfile(req, tracking);

      expect(authService.getProfile).toHaveBeenCalledWith('user-1', tracking);
      expect(result).toEqual(expected);
    });
  });

  describe('logout', () => {
    it('debe delegar el logout al AuthService con el id del usuario autenticado', async () => {
      const req = { user: { id: 'user-1' } };
      authService.logout.mockResolvedValue({ success: true } as never);

      const result = await controller.logout(req, tracking);

      expect(authService.logout).toHaveBeenCalledWith('user-1', tracking);
      expect(result).toEqual({ success: true });
    });
  });
});