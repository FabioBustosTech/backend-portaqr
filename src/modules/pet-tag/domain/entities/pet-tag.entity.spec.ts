import { PetTagEntity } from './pet-tag.entity';
import type { PetData } from './pet-tag.entity';

describe('PetTagEntity', () => {
  const petData: PetData = {
    ownerName: 'Juan',
    address: 'Av. Siempre Viva 123',
    phone: '+56912345678',
    petName: 'Fido',
  };

  it('debe construir la entidad con todos los datos entregados', () => {
    const createdAt = new Date('2024-01-01T00:00:00.000Z');
    const updatedAt = new Date('2024-06-01T00:00:00.000Z');
    const expiration = new Date('2025-08-07T00:00:00.000Z');

    const entity = new PetTagEntity({
      id: 'id-1',
      name: 'Placa de Fido',
      idQr: 'qr-1',
      userId: 'user-1',
      activationPin: 'A1B2C3',
      status: 'ACTIVO',
      petData,
      expiration,
      commercialStatus: 'VENDIDO',
      isFavorite: true,
      assignedStoreName: 'Mi Comercio',
      createdAt,
      updatedAt,
    });

    expect(entity.id).toBe('id-1');
    expect(entity.name).toBe('Placa de Fido');
    expect(entity.idQr).toBe('qr-1');
    expect(entity.userId).toBe('user-1');
    expect(entity.activationPin).toBe('A1B2C3');
    expect(entity.status).toBe('ACTIVO');
    expect(entity.petData).toEqual(petData);
    expect(entity.expiration).toEqual(expiration);
    expect(entity.commercialStatus).toBe('VENDIDO');
    expect(entity.isFavorite).toBe(true);
    expect(entity.assignedStoreName).toBe('Mi Comercio');
    expect(entity.createdAt).toEqual(createdAt);
    expect(entity.updatedAt).toEqual(updatedAt);
  });

  it('debe aplicar valores por defecto cuando no se entregan datos', () => {
    const entity = new PetTagEntity({});

    expect(entity.id).toBeUndefined();
    expect(entity.name).toBeUndefined();
    expect(entity.idQr).toBe('');
    expect(entity.userId).toBeNull();
    expect(entity.activationPin).toBe('');
    expect(entity.status).toBe('RESERVADO');
    expect(entity.petData).toBeNull();
    expect(entity.expiration).toBeNull();
    expect(entity.commercialStatus).toBe('EN_CREACION');
    expect(entity.isFavorite).toBe(false);
    expect(entity.assignedStoreName).toBeNull();
    expect(entity.createdAt).toBeUndefined();
    expect(entity.updatedAt).toBeUndefined();
  });

  it('debe aplicar valores por defecto cuando se entregan valores falsy', () => {
    const entity = new PetTagEntity({
      idQr: '',
      userId: null,
      activationPin: '',
      status: '',
      petData: null,
      expiration: null,
      commercialStatus: '',
      isFavorite: false,
      assignedStoreName: null,
    });

    expect(entity.idQr).toBe('');
    expect(entity.userId).toBeNull();
    expect(entity.activationPin).toBe('');
    expect(entity.status).toBe('RESERVADO');
    expect(entity.petData).toBeNull();
    expect(entity.expiration).toBeNull();
    expect(entity.commercialStatus).toBe('EN_CREACION');
    expect(entity.isFavorite).toBe(false);
    expect(entity.assignedStoreName).toBeNull();
  });
});