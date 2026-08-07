import { PetTagDto } from './pet-tag.dto';
import { PetData } from './create-pet-tag.dto';

describe('PetTagDto', () => {
  it('debe instanciarse con todos los campos', () => {
    const petData: PetData = {
      ownerName: 'Juan Pérez',
      address: 'Calle 123',
      phone: '+56912345678',
      petName: 'Fido',
      breed: 'Labrador',
    };

    const dto = new PetTagDto();
    dto.id = 'tag-1';
    dto.idQr = 'qr-1';
    dto.userId = 'user-1';
    dto.activationPin = '12345678';
    dto.status = 'ACTIVO';
    dto.petData = petData;
    dto.expiration = '2025-12-31';
    dto.createdAt = '2024-01-01T00:00:00.000Z';
    dto.updatedAt = '2024-01-02T00:00:00.000Z';

    expect(dto).toBeInstanceOf(PetTagDto);
    expect(dto.id).toBe('tag-1');
    expect(dto.idQr).toBe('qr-1');
    expect(dto.userId).toBe('user-1');
    expect(dto.activationPin).toBe('12345678');
    expect(dto.status).toBe('ACTIVO');
    expect(dto.petData).toEqual(petData);
    expect(dto.expiration).toBe('2025-12-31');
    expect(dto.createdAt).toBe('2024-01-01T00:00:00.000Z');
    expect(dto.updatedAt).toBe('2024-01-02T00:00:00.000Z');
  });

  it('debe permitir userId y expiration como null', () => {
    const dto = new PetTagDto();
    dto.userId = null;
    dto.expiration = null;

    expect(dto.userId).toBeNull();
    expect(dto.expiration).toBeNull();
  });

  it('debe aceptar cualquiera de los estados de la placa', () => {
    for (const status of ['RESERVADO', 'ACTIVO', 'INACTIVO']) {
      const dto = new PetTagDto();
      dto.status = status;
      expect(dto.status).toBe(status);
    }
  });
});