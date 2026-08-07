import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateQrFreeGenerationDto } from './update-qr-free-generation.dto';

describe('UpdateQrFreeGenerationDto', () => {
  it('debe instanciarse como UpdateQrFreeGenerationDto con propiedades parciales', () => {
    const dto = plainToInstance(UpdateQrFreeGenerationDto, {
      email: 'user@example.com',
    });

    expect(dto).toBeInstanceOf(UpdateQrFreeGenerationDto);
    expect(dto.email).toBe('user@example.com');
  });

  it('debe aceptar un payload parcial válido', async () => {
    const dto = plainToInstance(UpdateQrFreeGenerationDto, {
      email: 'user@example.com',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('debe aceptar un payload completo válido', async () => {
    const dto = plainToInstance(UpdateQrFreeGenerationDto, {
      email: 'user@example.com',
      information: { typeQr: 'url', data: 'https://ejemplo.com' },
      location: { latitude: 40.7128, longitude: -74.006, country: 'España', city: 'Madrid' },
      device: { platform: 'iOS', browser: 'Safari', isMobile: true },
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('debe fallar cuando el email provisto no es válido', async () => {
    const dto = plainToInstance(UpdateQrFreeGenerationDto, {
      email: 'no-es-un-email',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('debe fallar cuando information provista no es válida', async () => {
    const dto = plainToInstance(UpdateQrFreeGenerationDto, {
      email: 'user@example.com',
      information: { typeQr: 123, data: 456 },
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});