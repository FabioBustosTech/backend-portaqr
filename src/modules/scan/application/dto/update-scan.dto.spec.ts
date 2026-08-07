import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateScanDto } from './update-scan.dto';

describe('UpdateScanDto', () => {
  it('debe instanciarse como UpdateScanDto con propiedades parciales', () => {
    const dto = plainToInstance(UpdateScanDto, {
      origen: 'web',
      successful: true,
    });

    expect(dto).toBeInstanceOf(UpdateScanDto);
    expect(dto.origen).toBe('web');
    expect(dto.successful).toBe(true);
  });

  it('debe aceptar un payload parcial válido', async () => {
    const dto = plainToInstance(UpdateScanDto, {
      userId: 'user-1',
      errorMessage: 'Error al procesar',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('debe aceptar un payload completo válido', async () => {
    const dto = plainToInstance(UpdateScanDto, {
      idQr: '123e4567-e89b-42d3-a456-426614174000',
      userId: 'user-1',
      successful: true,
      origen: 'web',
      location: { latitude: 40.7128, longitude: -74.006 },
      device: { platform: 'iOS', browser: 'Safari', isMobile: true },
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('debe fallar cuando idQr provisto no es un UUID válido', async () => {
    const dto = plainToInstance(UpdateScanDto, {
      idQr: 'no-es-un-uuid',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('debe fallar cuando successful provisto no es booleano', async () => {
    const dto = plainToInstance(UpdateScanDto, {
      successful: 'si',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});