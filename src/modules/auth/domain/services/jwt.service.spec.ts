import { Test, TestingModule } from '@nestjs/testing';
import { JwtService as JwtServiceCore } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthService } from './jwt.service';
import type { User } from '../../../users/domain/entities/user.entity';
import { loadJwtKeys } from '../../infrastructure/jwt-keys';

jest.mock('../../infrastructure/jwt-keys', () => ({
  loadJwtKeys: jest.fn(),
}));

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
    tokenVersion: 0,
  };

  const mockPayload = {
    sub: 'user-1',
    email: 'test@test.com',
    userName: 'testuser',
    role: 'user',
    isEmailVerified: true,
    tokenVersion: 0,
    // SPEC-020 RF-9: claims agregados al JWT
    provider: 'local',
    hasPassword: true,
  };

  beforeEach(async () => {
    (loadJwtKeys as jest.Mock).mockReturnValue({
      privateKey: 'PRIVATE_PEM',
      publicKey: 'PUBLIC_PEM',
    });

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
                JWT_PRIVATE_KEY: 'keys/jwt-private.pem',
                JWT_PUBLIC_KEY: 'keys/jwt-public.pem',
                JWT_EXPIRATION: '24h',
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
    it('debe firmar con privateKey RS256, incluir tokenVersion y las expiraciones configuradas', async () => {
      jwtServiceCore.signAsync.mockResolvedValueOnce('access-token');
      jwtServiceCore.signAsync.mockResolvedValueOnce('refresh-token');

      const result = await service.generateTokens(mockUser);

      expect(jwtServiceCore.signAsync).toHaveBeenCalledTimes(2);
      expect(jwtServiceCore.signAsync).toHaveBeenNthCalledWith(1, mockPayload, {
        privateKey: 'PRIVATE_PEM',
        algorithm: 'RS256',
        expiresIn: '24h',
      });
      expect(jwtServiceCore.signAsync).toHaveBeenNthCalledWith(2, mockPayload, {
        privateKey: 'PRIVATE_PEM',
        algorithm: 'RS256',
        expiresIn: '7d',
      });
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(loadJwtKeys).toHaveBeenCalledWith(configService);
      expect(configService.get).toHaveBeenCalledWith('JWT_EXPIRATION');
      expect(configService.get).toHaveBeenCalledWith('JWT_REFRESH_EXPIRATION');
    });

    it('debe usar tokenVersion 0 cuando el usuario no lo tiene definido', async () => {
      jwtServiceCore.signAsync.mockResolvedValue('token');
      const userSinVersion: User = { ...mockUser, tokenVersion: undefined };

      await service.generateTokens(userSinVersion);

      expect(jwtServiceCore.signAsync).toHaveBeenNthCalledWith(
        1,
        { ...mockPayload, tokenVersion: 0 },
        expect.any(Object),
      );
    });
  });

  describe('verifyToken', () => {
    it('debe verificar con la publicKey y el algoritmo RS256 cuando el token es válido', () => {
      jwtServiceCore.verify.mockReturnValue(mockPayload as never);

      const result = service.verifyToken('valid-token');

      expect(jwtServiceCore.verify).toHaveBeenCalledWith('valid-token', {
        publicKey: 'PUBLIC_PEM',
        algorithms: ['RS256'],
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
    it('debe verificar con la publicKey y el algoritmo RS256', () => {
      jwtServiceCore.verify.mockReturnValue(mockPayload as never);

      const result = service.verifyRefreshToken('valid-refresh');

      expect(jwtServiceCore.verify).toHaveBeenCalledWith('valid-refresh', {
        publicKey: 'PUBLIC_PEM',
        algorithms: ['RS256'],
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
