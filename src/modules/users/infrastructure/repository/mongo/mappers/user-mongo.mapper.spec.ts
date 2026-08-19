import { UserMongoMapper } from './user-mongo.mapper';
import type { User } from '../../../../domain/entities/user.entity';

describe('UserMongoMapper', () => {
  const docCompleto = {
    _id: { toString: () => 'user-id-1' },
    email: 'usuario@test.com',
    userName: 'usuario1',
    password: 'hash-1',
    firstName: 'Juan',
    paternalLastName: 'Pérez',
    maternalLastName: 'García',
    role: 'admin',
    isEmailVerified: true,
    tokenVersion: 2,
    phone: '+56911111111',
    lastLogin: new Date('2024-08-01T12:00:00.000Z'),
    verificationCode: 'vc-1',
    verificationCodeExpires: new Date('2024-08-02T12:00:00.000Z'),
    passwordResetCode: 'prc-1',
    passwordResetExpires: new Date('2024-08-03T12:00:00.000Z'),
    verificationAttempts: 0,
    passwordResetAttempts: 0,
    welcomeEmailSent: false,
    provider: 'local',
    hasPassword: true,
    createdAt: new Date('2024-08-01T10:00:00.000Z'),
    updatedAt: new Date('2024-08-01T11:00:00.000Z'),
  };

  describe('toEntity', () => {
    it('debe mapear un documento con _id a entidad', () => {
      const entity = UserMongoMapper.toEntity(docCompleto);

      expect(entity).toEqual({
        id: 'user-id-1',
        email: 'usuario@test.com',
        userName: 'usuario1',
        password: 'hash-1',
        firstName: 'Juan',
        paternalLastName: 'Pérez',
        maternalLastName: 'García',
        role: 'admin',
        isEmailVerified: true,
        tokenVersion: 2,
        phone: '+56911111111',
        lastLogin: docCompleto.lastLogin,
        verificationCode: 'vc-1',
        verificationCodeExpires: docCompleto.verificationCodeExpires,
        verificationAttempts: 0,
        passwordResetCode: 'prc-1',
        passwordResetExpires: docCompleto.passwordResetExpires,
        passwordResetAttempts: 0,
        welcomeEmailSent: false,
        provider: 'local',
        hasPassword: true,
        createdAt: docCompleto.createdAt,
        updatedAt: docCompleto.updatedAt,
      });
    });

    it('debe usar id vacío cuando el documento no tiene _id', () => {
      const entity = UserMongoMapper.toEntity({ ...docCompleto, _id: undefined });

      expect(entity.id).toBe('');
      expect(entity.email).toBe('usuario@test.com');
    });

    it('debe usar role "user" por defecto cuando no viene el rol', () => {
      const entity = UserMongoMapper.toEntity({ ...docCompleto, role: undefined });

      expect(entity.role).toBe('user');
    });

    it('debe usar isEmailVerified false por defecto cuando no viene el flag', () => {
      const entity = UserMongoMapper.toEntity({ ...docCompleto, isEmailVerified: undefined });

      expect(entity.isEmailVerified).toBe(false);
    });

    it('debe propagar undefined en campos opcionales ausentes', () => {
      const entity = UserMongoMapper.toEntity({
        email: 'a@b.com',
        userName: 'ab',
        password: 'hash',
        firstName: 'A',
        paternalLastName: 'B',
        maternalLastName: 'C',
        role: 'user',
        isEmailVerified: false,
        tokenVersion: 0,
        verificationAttempts: 0,
        passwordResetAttempts: 0,
      } as never);

      expect(entity.phone).toBeUndefined();
      expect(entity.lastLogin).toBeUndefined();
      expect(entity.verificationCode).toBeUndefined();
      expect(entity.verificationCodeExpires).toBeUndefined();
      expect(entity.passwordResetCode).toBeUndefined();
      expect(entity.passwordResetExpires).toBeUndefined();
      expect(entity.createdAt).toBeUndefined();
      expect(entity.updatedAt).toBeUndefined();
      expect(entity.tokenVersion).toBe(0);
      expect(entity.welcomeEmailSent).toBe(false);
      expect(entity.provider).toBe('local');
    });
  });

  describe('toSchemaData', () => {
    it('debe mapear la entidad a datos de schema', () => {
      const user: User = {
        id: 'user-id-1',
        email: 'usuario@test.com',
        userName: 'usuario1',
        password: 'hash-1',
        firstName: 'Juan',
        paternalLastName: 'Pérez',
        maternalLastName: 'García',
        role: 'admin',
        isEmailVerified: true,
        tokenVersion: 2,
        phone: '+56911111111',
        lastLogin: docCompleto.lastLogin,
        verificationCode: 'vc-1',
        verificationCodeExpires: docCompleto.verificationCodeExpires,
        passwordResetCode: 'prc-1',
        passwordResetExpires: docCompleto.passwordResetExpires,
        welcomeEmailSent: false,
        provider: 'local',
        hasPassword: true,
        createdAt: docCompleto.createdAt,
        updatedAt: docCompleto.updatedAt,
      };

      const data = UserMongoMapper.toSchemaData(user);

      expect(data).toEqual({
        email: 'usuario@test.com',
        userName: 'usuario1',
        password: 'hash-1',
        firstName: 'Juan',
        paternalLastName: 'Pérez',
        maternalLastName: 'García',
        role: 'admin',
        isEmailVerified: true,
        tokenVersion: 2,
        phone: '+56911111111',
        lastLogin: docCompleto.lastLogin,
        verificationCode: 'vc-1',
        verificationCodeExpires: docCompleto.verificationCodeExpires,
        passwordResetCode: 'prc-1',
        passwordResetExpires: docCompleto.passwordResetExpires,
        welcomeEmailSent: false,
        provider: 'local',
        hasPassword: true,
      });
    });

    it('debe mapear datos parciales sin campos opcionales', () => {
      const data = UserMongoMapper.toSchemaData({
        email: 'nuevo@test.com',
        userName: 'nuevo1',
        firstName: 'N',
        paternalLastName: 'N',
        maternalLastName: 'N',
      });

      expect(data).toEqual({
        email: 'nuevo@test.com',
        userName: 'nuevo1',
        firstName: 'N',
        paternalLastName: 'N',
        maternalLastName: 'N',
        password: undefined,
        role: undefined,
        isEmailVerified: undefined,
        tokenVersion: undefined,
        phone: undefined,
        lastLogin: undefined,
        verificationCode: undefined,
        verificationCodeExpires: undefined,
        passwordResetCode: undefined,
        passwordResetExpires: undefined,
        welcomeEmailSent: undefined,
        googleId: undefined,
        provider: undefined,
        hasPassword: undefined,
        avatarUrl: undefined,
      });
    });
  });
});
