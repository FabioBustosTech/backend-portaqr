import { Reflector } from '@nestjs/core';
import { QrPublicThrottlerGuard } from './qr-public-throttler.guard';

/**
 * Exponer el método protegido getTracker para testearlo.
 */
class TestableGuard extends QrPublicThrottlerGuard {
  public async tracker(req: Record<string, any>): Promise<string> {
    return this.getTracker(req);
  }
}

function makeGuard(): TestableGuard {
  // El constructor solo asigna options/storageService/reflector — mocks triviales.
  return new TestableGuard({ throttlers: [] } as any, {} as any, new Reflector());
}

describe('QrPublicThrottlerGuard.getTracker (SPEC-011 Capa B)', () => {
  let guard: TestableGuard;

  beforeEach(() => {
    guard = makeGuard();
  });

  it('usa params.id (GET /qr/public/:id) como clave idqr', async () => {
    const req = { params: { id: '24aad686-dca4-4654-9e30-cf642105c34d' }, headers: {} };
    await expect(guard.tracker(req)).resolves.toBe(
      'idqr:24aad686-dca4-4654-9e30-cf642105c34d',
    );
  });

  it('usa body.idQr (POST /scan/stats) como clave idqr', async () => {
    const req = { body: { idQr: 'scan-target-1' }, params: {}, headers: {} };
    await expect(guard.tracker(req)).resolves.toBe('idqr:scan-target-1');
  });

  it('body.idQr tiene prioridad sobre params.id', async () => {
    const req = { body: { idQr: 'body-1' }, params: { id: 'params-1' }, headers: {} };
    await expect(guard.tracker(req)).resolves.toBe('idqr:body-1');
  });

  it('params.idQr también sirve como clave (otras rutas con nombre idQr)', async () => {
    const req = { params: { idQr: 'pet-1' }, headers: {} };
    await expect(guard.tracker(req)).resolves.toBe('idqr:pet-1');
  });

  it('sin idQr: usa cf-connecting-ip válido (acceso directo con header real)', async () => {
    const req = {
      params: {},
      headers: { 'cf-connecting-ip': '190.10.20.30' },
      ip: '10.0.0.5',
    };
    await expect(guard.tracker(req)).resolves.toBe('ip:190.10.20.30');
  });

  it('cf-connecting-ip inválido (spoofing) se ignora y cae a x-forwarded-for[0]', async () => {
    const req = {
      params: {},
      headers: {
        'cf-connecting-ip': '<script>rotar</script>',
        'x-forwarded-for': '5.6.7.8, 9.9.9.9',
      },
      ip: '10.0.0.5',
    };
    await expect(guard.tracker(req)).resolves.toBe('ip:5.6.7.8');
  });

  it('sin headers: cae a req.ip (IP interna de qr-app en la red privada)', async () => {
    const req = { params: {}, headers: {}, ip: '172.18.0.7' };
    await expect(guard.tracker(req)).resolves.toBe('ip:172.18.0.7');
  });

  it('idQr demasiado largo (>64) se rechaza y cae a IP (protege el storage)', async () => {
    const req = {
      params: { id: 'a'.repeat(100) },
      headers: {},
      ip: '10.0.0.9',
    };
    await expect(guard.tracker(req)).resolves.toBe('ip:10.0.0.9');
  });

  it('idQr vacío cae a IP', async () => {
    const req = { params: { id: '' }, headers: {}, ip: '10.0.0.9' };
    await expect(guard.tracker(req)).resolves.toBe('ip:10.0.0.9');
  });
});
