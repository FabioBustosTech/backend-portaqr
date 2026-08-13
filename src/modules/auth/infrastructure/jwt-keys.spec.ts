import { loadJwtKeys } from './jwt-keys';
import type { ConfigService } from '@nestjs/config';

/**
 * SPEC-009 A6 — fail-fast de llaves JWT (CA-06):
 * producción sin llaves → throw (no arranca); dev/test sin llaves → par efímero.
 */
describe('loadJwtKeys (SPEC-009 A6)', () => {
  const PEM_PRIVATE = '-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----';
  const PEM_PUBLIC = '-----BEGIN PUBLIC KEY-----\nMIIBIj...\n-----END PUBLIC KEY-----';

  const mockConfig = (env: Record<string, string | undefined>) =>
    ({
      get: (key: string) => env[key],
    }) as unknown as ConfigService;

  it('usa las llaves PEM inline cuando existen (production)', () => {
    const config = mockConfig({
      NODE_ENV: 'production',
      JWT_PRIVATE_KEY: PEM_PRIVATE,
      JWT_PUBLIC_KEY: PEM_PUBLIC,
    });
    const keys = loadJwtKeys(config);
    expect(keys.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
    expect(keys.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
  });

  it('SPEC-009 A6: production SIN llaves válidas → throw (fail-fast, no arranca)', () => {
    // Rutas inexistentes: ni env vars PEM ni archivos → la lectura falla → throw en prod
    const config = mockConfig({
      NODE_ENV: 'production',
      JWT_PRIVATE_KEY: 'keys/no-existe-priv.pem',
      JWT_PUBLIC_KEY: 'keys/no-existe-pub.pem',
    });
    expect(() => loadJwtKeys(config)).toThrow(/JWT_PRIVATE_KEY\/JWT_PUBLIC_KEY/);
  });

  it('SPEC-009 A6: development con rutas inexistentes → par efímero (sin throw)', () => {
    const config = mockConfig({
      NODE_ENV: 'development',
      JWT_PRIVATE_KEY: 'keys/no-existe-priv.pem',
      JWT_PUBLIC_KEY: 'keys/no-existe-pub.pem',
    });
    const keys = loadJwtKeys(config);
    expect(keys.privateKey).toContain('-----BEGIN');
    expect(keys.publicKey).toContain('-----BEGIN');
  });

  it('SPEC-009 A6: NODE_ENV ausente → par efímero (default development)', () => {
    const config = mockConfig({});
    expect(() => loadJwtKeys(config)).not.toThrow();
  });
});
