import { UserEntity } from './user.entity';

describe('UserEntity', () => {
  describe('constructor', () => {
    it('debe aplicar valores por defecto cuando no se proporcionan datos', () => {
      const entity = new UserEntity({});

      expect(entity.id).toBe('');
      expect(entity.email).toBe('');
      expect(entity.userName).toBe('');
      expect(entity.firstName).toBe('');
      expect(entity.paternalLastName).toBe('');
      expect(entity.maternalLastName).toBe('');
      expect(entity.role).toBe('user');
      expect(entity.isEmailVerified).toBe(false);
      expect(entity.password).toBeUndefined();
      expect(entity.phone).toBeUndefined();
    });

    it('debe respetar los valores proporcionados', () => {
      const entity = new UserEntity({
        id: 'user-1',
        email: 'a@test.com',
        userName: 'usuario',
        password: 'hash',
        firstName: 'Ana',
        paternalLastName: 'Pérez',
        maternalLastName: 'Gómez',
        role: 'admin',
        isEmailVerified: true,
        phone: '123456789',
      });

      expect(entity.id).toBe('user-1');
      expect(entity.email).toBe('a@test.com');
      expect(entity.role).toBe('admin');
      expect(entity.isEmailVerified).toBe(true);
      expect(entity.password).toBe('hash');
      expect(entity.phone).toBe('123456789');
    });
  });

  describe('actualizar', () => {
    it('debe actualizar solo los campos definidos y conservar el resto', () => {
      const entity = new UserEntity({
        id: 'user-1',
        email: 'a@test.com',
        userName: 'usuario',
        firstName: 'Ana',
        paternalLastName: 'Pérez',
        maternalLastName: 'Gómez',
        role: 'user',
        isEmailVerified: false,
      });

      entity.actualizar({ firstName: 'NuevoNombre' });

      expect(entity.firstName).toBe('NuevoNombre');
      expect(entity.email).toBe('a@test.com');
      expect(entity.userName).toBe('usuario');
      expect(entity.role).toBe('user');
      expect(entity.updatedAt).toBeInstanceOf(Date);
    });

    it('debe actualizar todos los campos cuando se proporcionan', () => {
      const entity = new UserEntity({
        id: 'user-1',
        email: 'a@test.com',
        userName: 'usuario',
        firstName: 'Ana',
        paternalLastName: 'Pérez',
        maternalLastName: 'Gómez',
        role: 'user',
        isEmailVerified: false,
      });

      const lastLogin = new Date('2025-01-01');
      const expires = new Date('2025-02-01');

      entity.actualizar({
        email: 'nuevo@test.com',
        userName: 'nuevousuario',
        password: 'nuevo-hash',
        firstName: 'Nuevo',
        paternalLastName: 'NuevoPaterno',
        maternalLastName: 'NuevoMaterno',
        role: 'admin',
        isEmailVerified: true,
        phone: '987654321',
        lastLogin,
        verificationCode: 'ABC123',
        verificationCodeExpires: expires,
        passwordResetCode: 'RESET1',
        passwordResetExpires: expires,
      });

      expect(entity.email).toBe('nuevo@test.com');
      expect(entity.userName).toBe('nuevousuario');
      expect(entity.password).toBe('nuevo-hash');
      expect(entity.firstName).toBe('Nuevo');
      expect(entity.paternalLastName).toBe('NuevoPaterno');
      expect(entity.maternalLastName).toBe('NuevoMaterno');
      expect(entity.role).toBe('admin');
      expect(entity.isEmailVerified).toBe(true);
      expect(entity.phone).toBe('987654321');
      expect(entity.lastLogin).toEqual(lastLogin);
      expect(entity.verificationCode).toBe('ABC123');
      expect(entity.verificationCodeExpires).toEqual(expires);
      expect(entity.passwordResetCode).toBe('RESET1');
      expect(entity.passwordResetExpires).toEqual(expires);
    });
  });
});