import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('hashPassword', () => {
    it('debe generar un hash bcrypt válido para la contraseña', async () => {
      const hash = await service.hashPassword('password123');

      expect(hash).toBeDefined();
      expect(hash.startsWith('$2')).toBe(true);
      expect(hash).not.toBe('password123');
    });

    it('debe generar hashes distintos para la misma contraseña (salt aleatorio)', async () => {
      const hash1 = await service.hashPassword('password123');
      const hash2 = await service.hashPassword('password123');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    it('debe retornar true cuando la contraseña coincide con el hash', async () => {
      const hash = await service.hashPassword('password123');

      const result = await service.comparePassword('password123', hash);

      expect(result).toBe(true);
    });

    it('debe retornar false cuando la contraseña no coincide', async () => {
      const hash = await service.hashPassword('password123');

      const result = await service.comparePassword('incorrecta', hash);

      expect(result).toBe(false);
    });
  });

  describe('isPasswordStrong', () => {
    it('debe retornar inválido si la contraseña tiene menos de 8 caracteres', () => {
      const result = service.isPasswordStrong('corta1');

      expect(result.valido).toBe(false);
      expect(result.message).toContain('8 caracteres');
    });

    it('debe retornar válido si la contraseña tiene 8 o más caracteres', () => {
      const result = service.isPasswordStrong('password123');

      expect(result.valido).toBe(true);
      expect(result.message).toBe('');
    });
  });
});