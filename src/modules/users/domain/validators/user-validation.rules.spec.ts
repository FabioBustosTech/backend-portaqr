import { UserValidationRules } from './user-validation.rules';

describe('UserValidationRules', () => {
  let rules: UserValidationRules;

  beforeEach(() => {
    rules = new UserValidationRules();
  });

  it('debe estar definido', () => {
    expect(rules).toBeDefined();
  });

  describe('validateForCreate', () => {
    const validData = {
      email: 'juan@ejemplo.com',
      userName: 'juanperez',
      password: 'password123',
      firstName: 'Juan',
      paternalLastName: 'Pérez',
      maternalLastName: 'Gómez',
    };

    it('debe retornar válido cuando todos los campos son correctos', () => {
      const result = rules.validateForCreate(validData);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('debe retornar error si el email es requerido', () => {
      const result = rules.validateForCreate({ ...validData, email: '' });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('El email es requerido');
    });

    it('debe retornar error si el email tiene formato inválido', () => {
      const result = rules.validateForCreate({
        ...validData,
        email: 'correo-invalido',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('El formato del email es inválido');
    });

    it('debe retornar error si el nombre de usuario es requerido', () => {
      const result = rules.validateForCreate({ ...validData, userName: '  ' });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('El nombre de usuario es requerido');
    });

    it('debe retornar error si la contraseña es requerida', () => {
      const result = rules.validateForCreate({ ...validData, password: '' });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('La contraseña es requerida');
    });

    it('debe retornar error si la contraseña tiene menos de 6 caracteres', () => {
      const result = rules.validateForCreate({ ...validData, password: '12345' });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'La contraseña debe tener al menos 6 caracteres',
      );
    });

    it('debe retornar error si el nombre es requerido', () => {
      const result = rules.validateForCreate({ ...validData, firstName: '' });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('El nombre es requerido');
    });

    it('debe retornar error si el apellido paterno es requerido', () => {
      const result = rules.validateForCreate({
        ...validData,
        paternalLastName: '',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('El apellido paterno es requerido');
    });

    it('debe retornar error si el apellido materno es requerido', () => {
      const result = rules.validateForCreate({
        ...validData,
        maternalLastName: '',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('El apellido materno es requerido');
    });

    it('debe acumular múltiples errores a la vez', () => {
      const result = rules.validateForCreate({
        email: '',
        userName: '',
        password: '',
        firstName: '',
        paternalLastName: '',
        maternalLastName: '',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('normalize', () => {
    it('debe recortar espacios y convertir el email a minúsculas', () => {
      const result = rules.normalize({
        email: '  Juan@Ejemplo.COM ',
        userName: '  juanperez ',
        firstName: ' Juan ',
        paternalLastName: ' Pérez ',
        maternalLastName: ' Gómez ',
      });

      expect(result.email).toBe('juan@ejemplo.com');
      expect(result.userName).toBe('juanperez');
      expect(result.firstName).toBe('Juan');
      expect(result.paternalLastName).toBe('Pérez');
      expect(result.maternalLastName).toBe('Gómez');
    });

    it('debe manejar campos undefined', () => {
      const result = rules.normalize({});

      expect(result.email).toBeUndefined();
      expect(result.userName).toBeUndefined();
      expect(result.firstName).toBeUndefined();
      expect(result.paternalLastName).toBeUndefined();
      expect(result.maternalLastName).toBeUndefined();
    });
  });
});