import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    login: jest.fn(),
    refreshToken: jest.fn(),
    getProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('debe llamar a authService.login y devolver el resultado', async () => {
      const loginDto = { username: 'test@test.com', password: 'password123' };
      const expected = { accessToken: 'token', user: { id: '1', role: 'user' } };
      mockAuthService.login.mockResolvedValue(expected);

      const req = { trackingId: 'track-1' };
      const result = await controller.login(loginDto as any, req as any);

      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto, 'track-1');
      expect(result).toEqual(expected);
    });

    it('debe propagar errores de credenciales inválidas', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Contraseña incorrecta'));
      const loginDto = { username: 'test@test.com', password: 'wrong' };

      await expect(controller.login(loginDto as any, { trackingId: 't' } as any))
        .rejects.toThrow('Contraseña incorrecta');
    });
  });

  describe('refreshToken', () => {
    it('debe llamar a authService.refreshToken con el refreshToken', async () => {
      const expected = { accessToken: 'new-token' };
      mockAuthService.refreshToken.mockResolvedValue(expected);

      const result = await controller.refreshToken(
        { refreshToken: 'refresh-abc' } as any,
        { trackingId: 'track-2' } as any,
      );

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('refresh-abc', 'track-2');
      expect(result).toEqual(expected);
    });
  });

  describe('getProfile', () => {
    it('debe llamar a authService.getProfile con el id del usuario', async () => {
      const expected = { id: '1', email: 'test@test.com', role: 'user' };
      mockAuthService.getProfile.mockResolvedValue(expected);

      const result = await controller.getProfile({
        trackingId: 'track-3',
        user: { id: '1' },
      } as any);

      expect(mockAuthService.getProfile).toHaveBeenCalledWith('1', 'track-3');
      expect(result).toEqual(expected);
    });
  });
});