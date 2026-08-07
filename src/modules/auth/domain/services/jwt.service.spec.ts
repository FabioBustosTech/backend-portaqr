import { Test, TestingModule } from '@nestjs/testing';
import { JwtService as JwtServiceCore } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthService } from './jwt.service';
import type { User } from '../../../users/domain/entities/user.entity';

describe('JwtAuthService', () => {
  let service: JwtAuthService;
  let jwtServiceCore: jest.Mocked<JwtServiceCore>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@test.com',
    userName: 'testuser',
    firstName: 'Test',
    paternalLastName: 'A',
    maternalLastName: 'B',
    role: 'user',
    isEmailVerified: true,
  };

  const mockPayload = {
    sub: 'user-1',
    email: 'test@test.com',
    userName: 'testuser',
    role: 'user',
    isEmailVerified: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthService,
        {
          provide: JwtServiceCore,
          useValue: {
            signAsync: jest.fn(),
            verify: jest.fn(),
            decode: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const values = {
                JWT_SECRET: 'secret',
                JWT_EXPIRATION: '1h',
                JWT_REFRESH_SECRET: 'refresh-secret',
                JWT_REFRESH_EXPIRATION: '7d',
              };
              return values[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<JwtAuthService>(JwtAuthService);
    jwtServiceCore = module.get(JwtServiceCore);
    configService = module.get(ConfigService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('generateTokens', () => {
    it('debe generar access token y refresh token con los secretos y expiraciones configurados', async () => {
      jwtServiceCore.signAsync.mockResolvedValueOnce('access-token');
      jwtServiceCore.signAsync.mockResolvedValueOnce('refresh-token');

      const result = await service.generateTokens(mockUser);

      expect(jwtServiceCore.signAsync).toHaveBeenCalledTimes(2);
      expect(jwtServiceCore.signAsync).toHaveBeenNthCalledWith(1, mockPayload, {
        secret: 'secret',
        expiresIn: '1h',
      });
      expect(jwtServiceCore.signAsync).toHaveBeenNthCalledWith(2, mockPayload, {
        secret: 'refresh-secret',
        expiresIn: '7d',
      });
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
      expect(configService.get).toHaveBeenCalledWith('JWT_REFRESH_SECRET');
    });
  });

  describe('verifyToken', () => {
    it('debe retornar el payload cuando el token es válido', () => {
      jwtServiceCore.verify.mockReturnValue(mockPayload as never);

      const result = service.verifyToken('valid-token');

      expect(jwtServiceCore.verify).toHaveBeenCalledWith('valid-token', {
        secret: 'secret',
      });
      expect(result).toEqual(mockPayload);
    });

    it('debe lanzar UnauthorizedException cuando el token es inválido', () => {
      jwtServiceCore.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      expect(() => service.verifyToken('bad-token')).toThrow(UnauthorizedException);
    });
  });

  describe('verifyRefreshToken', () => {
    it('debe verificar con el refresh secret y algoritmos HS256', () => {
      jwtServiceCore.verify.mockReturnValue(mockPayload as never);

      const result = service.verifyRefreshToken('valid-refresh');

      expect(jwtServiceCore.verify).toHaveBeenCalledWith('valid-refresh', {
        secret: 'refresh-secret',
        algorithms: ['HS256'],
      });
      expect(result).toEqual(mockPayload);
    });

    it('debe lanzar UnauthorizedException cuando el refresh token es inválido', () => {
      jwtServiceCore.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      expect(() => service.verifyRefreshToken('bad-refresh')).toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('decodeToken', () => {
    it('debe retornar el payload decodificado', () => {
      jwtServiceCore.decode.mockReturnValue(mockPayload as never);

      const result = service.decodeToken('some-token');

      expect(jwtServiceCore.decode).toHaveBeenCalledWith('some-token');
      expect(result).toEqual(mockPayload);
    });

    it('debe retornar null si el decode falla', () => {
      jwtServiceCore.decode.mockImplementation(() => {
        throw new Error('decode error');
      });

      const result = service.decodeToken('bad-token');

      expect(result).toBeNull();
    });
  });
});
