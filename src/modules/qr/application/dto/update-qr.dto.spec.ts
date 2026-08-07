import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateQrDto } from './update-qr.dto';
import { QrType } from './create-qr.dto';

describe('UpdateQrDto', () => {
  it('debe instanciarse como UpdateQrDto con propiedades parciales', () => {
    const dto = plainToInstance(UpdateQrDto, {
      name: 'Nuevo nombre',
      active: true,
    });

    expect(dto).toBeInstanceOf(UpdateQrDto);
    expect(dto.name).toBe('Nuevo nombre');
    expect(dto.active).toBe(true);
  });

  it('debe aceptar un payload parcial válido', async () => {
    const dto = plainToInstance(UpdateQrDto, {
      name: 'QR actualizado',
      description: 'Descripción',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('debe aceptar un payload completo válido', async () => {
    const dto = plainToInstance(UpdateQrDto, {
      idQr: '123e4567-e89b-42d3-a456-426614174000',
      userId: 'user-1',
      name: 'QR',
      active: true,
      isFavorite: false,
      isOldMode: false,
      typeQr: QrType.DYNAMIC,
      data: { typeQr: QrType.DYNAMIC, url: 'https://example.com' },
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('debe fallar si un campo provisto es inválido', async () => {
    const dto = plainToInstance(UpdateQrDto, {
      idQr: 'no-es-un-uuid',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('debe fallar si el tipo de QR provisto no es válido', async () => {
    const dto = plainToInstance(UpdateQrDto, {
      typeQr: 'tipo-invalido',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});