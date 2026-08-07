import { UserAggregate } from './user.aggregate';
import type { UserSnapshot } from './user.aggregate';

describe('UserAggregate', () => {
  const baseProps = {
    email: 'test@test.com',
    userName: 'testuser',
    firstName: 'Test',
    paternalLastName: 'Apellido',
    maternalLastName: 'Apellido2',
  };

  describe('crear', () => {
    it('debe crear un usuario con valores por defecto', () => {
      const aggregate = UserAggregate.crear(baseProps);

      expect(aggregate.id).toBeDefined();
      expect(aggregate.role).toBe('user');
      expect(aggregate.isEmailVerified).toBe(false);
      expect(aggregate.createdAt).toBeInstanceOf(Date);
      expect(aggregate.email).toBe('test@test.com');
      expect(aggregate.userName).toBe('testuser');
    });

    it('debe respetar el id y role proporcionados', () => {
      const aggregate = UserAggregate.crear({
        ...baseProps,
        id: 'custom-id',
        role: 'admin',
        isEmailVerified: true,
      });

      expect(aggregate.id).toBe('custom-id');
      expect(aggregate.role).toBe('admin');
      expect(aggregate.isEmailVerified).toBe(true);
    });
  });

  describe('cargarExistente', () => {
    it('debe restaurar el agregado desde un snapshot', () => {
      const snapshot: UserSnapshot = {
        id: 'user-1',
        email: 'a@test.com',
        userName: 'usuario',
        password: 'hash',
        firstName: 'Ana',
        paternalLastName: 'Pérez',
        maternalLastName: 'Gómez',
        role: 'admin',
        isEmailVerified: true,
        createdAt: new Date('2024-01-01'),
      };

      const aggregate = UserAggregate.cargarExistente(snapshot);

      expect(aggregate.id).toBe('user-1');
      expect(aggregate.email).toBe('a@test.com');
      expect(aggregate.role).toBe('admin');
      expect(aggregate.password).toBe('hash');
      expect(aggregate.createdAt).toEqual(snapshot.createdAt);
    });
  });

  describe('actualizar', () => {
    it('debe retornar una nueva instancia con los campos actualizados sin mutar la original', () => {
      const aggregate = UserAggregate.crear(baseProps);
      const updated = aggregate.actualizar({ firstName: 'NuevoNombre' });

      expect(updated.firstName).toBe('NuevoNombre');
      expect(aggregate.firstName).toBe('Test');
      expect(updated).not.toBe(aggregate);
      expect(updated.updatedAt).toBeInstanceOf(Date);
    });

    it('debe conservar los campos no actualizados', () => {
      const aggregate = UserAggregate.crear(baseProps);
      const updated = aggregate.actualizar({ phone: '123456789' });

      expect(updated.phone).toBe('123456789');
      expect(updated.email).toBe('test@test.com');
      expect(updated.userName).toBe('testuser');
    });
  });

  describe('verificarEmail', () => {
    it('debe marcar el email como verificado', () => {
      const aggregate = UserAggregate.crear({
        ...baseProps,
        verificationCode: 'ABC123',
        verificationCodeExpires: new Date(),
      });

      const verified = aggregate.verificarEmail();

      expect(verified.isEmailVerified).toBe(true);
      // Nota: actualizar usa ?? por lo que undefined conserva los valores previos
      expect(verified.verificationCode).toBe('ABC123');
      expect(verified.verificationCodeExpires).toBeInstanceOf(Date);
    });
  });

  describe('asignarCodigoVerificacion', () => {
    it('debe asignar el código y la expiración', () => {
      const aggregate = UserAggregate.crear(baseProps);
      const expires = new Date('2025-01-01');

      const withCode = aggregate.asignarCodigoVerificacion('XYZ789', expires);

      expect(withCode.verificationCode).toBe('XYZ789');
      expect(withCode.verificationCodeExpires).toEqual(expires);
    });
  });

  describe('asignarCodigoReset', () => {
    it('debe asignar el código de reset y la expiración', () => {
      const aggregate = UserAggregate.crear(baseProps);
      const expires = new Date('2025-01-01');

      const withCode = aggregate.asignarCodigoReset('RESET1', expires);

      expect(withCode.passwordResetCode).toBe('RESET1');
      expect(withCode.passwordResetExpires).toEqual(expires);
    });
  });

  describe('cambiarPassword', () => {
    it('debe cambiar la contraseña', () => {
      const aggregate = UserAggregate.crear({
        ...baseProps,
        passwordResetCode: 'RESET1',
        passwordResetExpires: new Date(),
      });

      const changed = aggregate.cambiarPassword('nuevo-hash');

      expect(changed.password).toBe('nuevo-hash');
      // Nota: actualizar usa ?? por lo que undefined conserva los valores previos
      expect(changed.passwordResetCode).toBe('RESET1');
      expect(changed.passwordResetExpires).toBeInstanceOf(Date);
    });
  });

  describe('registrarLogin', () => {
    it('debe registrar la fecha del último login', () => {
      const aggregate = UserAggregate.crear(baseProps);

      const logged = aggregate.registrarLogin();

      expect(logged.lastLogin).toBeInstanceOf(Date);
    });
  });

  describe('toSnapshot / toEntity', () => {
    it('debe serializar el agregado a snapshot con todos los campos', () => {
      const aggregate = UserAggregate.crear({
        ...baseProps,
        id: 'user-1',
        phone: '123456789',
      });

      const snapshot = aggregate.toSnapshot();

      expect(snapshot.id).toBe('user-1');
      expect(snapshot.email).toBe('test@test.com');
      expect(snapshot.phone).toBe('123456789');
      expect(snapshot.role).toBe('user');
      expect(snapshot.isEmailVerified).toBe(false);
    });

    it('toEntity debe devolver el mismo snapshot', () => {
      const aggregate = UserAggregate.crear(baseProps);

      expect(aggregate.toEntity()).toEqual(aggregate.toSnapshot());
    });
  });

  describe('getters', () => {
    it('debe exponer todos los valores a través de getters', () => {
      const aggregate = UserAggregate.crear(baseProps);

      expect(aggregate.id).toBeDefined();
      expect(aggregate.email).toBe('test@test.com');
      expect(aggregate.userName).toBe('testuser');
      expect(aggregate.firstName).toBe('Test');
      expect(aggregate.paternalLastName).toBe('Apellido');
      expect(aggregate.maternalLastName).toBe('Apellido2');
      expect(aggregate.role).toBe('user');
      expect(aggregate.isEmailVerified).toBe(false);
      expect(aggregate.password).toBeUndefined();
      expect(aggregate.phone).toBeUndefined();
      expect(aggregate.lastLogin).toBeUndefined();
      expect(aggregate.verificationCode).toBeUndefined();
      expect(aggregate.verificationCodeExpires).toBeUndefined();
      expect(aggregate.passwordResetCode).toBeUndefined();
      expect(aggregate.passwordResetExpires).toBeUndefined();
      expect(aggregate.createdAt).toBeInstanceOf(Date);
      expect(aggregate.updatedAt).toBeUndefined();
    });
  });
});