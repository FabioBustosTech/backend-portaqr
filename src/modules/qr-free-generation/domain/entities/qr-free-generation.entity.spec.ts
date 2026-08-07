import { QrFreeGenerationEntity } from './qr-free-generation.entity';

describe('QrFreeGenerationEntity', () => {
  it('debe construir una entidad con los valores entregados', () => {
    const entity = new QrFreeGenerationEntity({
      id: 'qr-free-1',
      email: 'usuario@ejemplo.com',
      information: { typeQr: 'url', data: 'https://ejemplo.com' },
      location: { latitude: 40.7128, longitude: -74.006 },
      device: { platform: 'iOS', browser: 'Safari', isMobile: true },
      createdAt: new Date('2024-01-01T10:00:00Z'),
    });

    expect(entity.id).toBe('qr-free-1');
    expect(entity.email).toBe('usuario@ejemplo.com');
    expect(entity.information).toEqual({ typeQr: 'url', data: 'https://ejemplo.com' });
    expect(entity.location).toEqual({ latitude: 40.7128, longitude: -74.006 });
    expect(entity.device).toEqual({ platform: 'iOS', browser: 'Safari', isMobile: true });
    expect(entity.createdAt).toEqual(new Date('2024-01-01T10:00:00Z'));
  });

  it('debe aplicar valores por defecto cuando los datos están vacíos', () => {
    const entity = new QrFreeGenerationEntity({});

    expect(entity.email).toBe('');
    expect(entity.information).toEqual({ typeQr: '', data: '' });
    expect(entity.id).toBeUndefined();
    expect(entity.location).toBeUndefined();
    expect(entity.device).toBeUndefined();
    expect(entity.createdAt).toBeUndefined();
  });

  it('debe conservar los campos opcionales cuando se entregan parcialmente', () => {
    const entity = new QrFreeGenerationEntity({
      email: 'a@b.cl',
      information: { typeQr: 'text', data: 'Hola' },
    });

    expect(entity.email).toBe('a@b.cl');
    expect(entity.information).toEqual({ typeQr: 'text', data: 'Hola' });
    expect(entity.location).toBeUndefined();
    expect(entity.device).toBeUndefined();
  });
});