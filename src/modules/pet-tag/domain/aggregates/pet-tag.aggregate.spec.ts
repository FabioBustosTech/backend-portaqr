import { randomUUID } from 'crypto';
import { PetTagAggregate } from './pet-tag.aggregate';
import type { PetData } from '../entities/pet-tag.entity';

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: jest.fn(() => 'generated-uuid-123'),
}));

describe('PetTagAggregate', () => {
  const petData: PetData = {
    ownerName: 'Juan',
    address: 'Av. Siempre Viva 123',
    phone: '+56912345678',
    petName: 'Fido',
  };

  const expiration = new Date('2025-08-07T00:00:00.000Z');

  describe('crear', () => {
    it('debe crear una placa con valores por defecto y un id generado', () => {
      const aggregate = PetTagAggregate.crear({
        idQr: 'qr-1',
        activationPin: 'A1B2C3',
      });

      expect(aggregate.id).toBe('generated-uuid-123');
      expect(aggregate.idQr).toBe('qr-1');
      expect(aggregate.activationPin).toBe('A1B2C3');
      expect(aggregate.userId).toBeNull();
      expect(aggregate.status).toBe('RESERVADO');
      expect(aggregate.petData).toBeNull();
      expect(aggregate.expiration).toBeNull();
      expect(aggregate.commercialStatus).toBe('EN_CREACION');
      expect(aggregate.isFavorite).toBe(false);
      expect(aggregate.assignedStoreName).toBeNull();
      expect(aggregate.createdAt).toBeInstanceOf(Date);
      expect(aggregate.updatedAt).toBeUndefined();
    });

    it('debe respetar los valores provistos y el id entregado', () => {
      const tag = PetTagAggregate.crear({
        id: 'id-explicito',
        name: 'Placa de Fido',
        idQr: 'qr-2',
        userId: 'user-1',
        activationPin: 'D4E5F6',
        status: 'ACTIVO',
        petData,
        expiration,
        commercialStatus: 'VENDIDO',
        isFavorite: true,
        assignedStoreName: 'Mi Comercio',
      });

      expect(tag.id).toBe('id-explicito');
      expect(tag.name).toBe('Placa de Fido');
      expect(tag.userId).toBe('user-1');
      expect(tag.status).toBe('ACTIVO');
      expect(tag.petData).toEqual(petData);
      expect(tag.expiration).toEqual(expiration);
      expect(tag.commercialStatus).toBe('VENDIDO');
      expect(tag.isFavorite).toBe(true);
      expect(tag.assignedStoreName).toBe('Mi Comercio');
    });
  });

  describe('cargarExistente', () => {
    it('debe restaurar una placa desde un snapshot', () => {
      const snapshot = {
        id: 'id-1',
        name: 'Placa',
        idQr: 'qr-1',
        userId: 'user-1',
        activationPin: 'A1B2C3',
        status: 'ACTIVO',
        petData,
        expiration,
        commercialStatus: 'VENDIDO',
        isFavorite: true,
        assignedStoreName: 'Tienda',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-06-01T00:00:00.000Z'),
      };

      const tag = PetTagAggregate.cargarExistente(snapshot);

      expect(tag.id).toBe('id-1');
      expect(tag.idQr).toBe('qr-1');
      expect(tag.userId).toBe('user-1');
      expect(tag.status).toBe('ACTIVO');
      expect(tag.petData).toEqual(petData);
      expect(tag.expiration).toEqual(expiration);
      expect(tag.commercialStatus).toBe('VENDIDO');
      expect(tag.isFavorite).toBe(true);
      expect(tag.assignedStoreName).toBe('Tienda');
      expect(tag.createdAt).toEqual(snapshot.createdAt);
      expect(tag.updatedAt).toEqual(snapshot.updatedAt);
    });
  });

  describe('actualizar', () => {
    it('debe retornar una nueva instancia con los campos actualizados sin mutar la original', () => {
      const original = PetTagAggregate.crear({
        id: 'id-1',
        idQr: 'qr-1',
        activationPin: 'A1B2C3',
      });

      const updated = original.actualizar({
        name: 'Nuevo nombre',
        petData,
        isFavorite: true,
        commercialStatus: 'EN_BODEGA',
      });

      expect(updated).not.toBe(original);
      expect(updated.name).toBe('Nuevo nombre');
      expect(updated.petData).toEqual(petData);
      expect(updated.isFavorite).toBe(true);
      expect(updated.commercialStatus).toBe('EN_BODEGA');
      expect(updated.updatedAt).toBeInstanceOf(Date);
      // La instancia original no se modifica
      expect(original.name).toBeUndefined();
      expect(original.isFavorite).toBe(false);
      expect(original.commercialStatus).toBe('EN_CREACION');
      expect(original.updatedAt).toBeUndefined();
    });

    it('debe preservar los valores existentes cuando no se entregan datos nuevos', () => {
      const original = PetTagAggregate.crear({
        id: 'id-1',
        name: 'Placa',
        idQr: 'qr-1',
        activationPin: 'A1B2C3',
        status: 'ACTIVO',
      });

      const updated = original.actualizar({});

      expect(updated.idQr).toBe('qr-1');
      expect(updated.activationPin).toBe('A1B2C3');
      expect(updated.name).toBe('Placa');
      expect(updated.status).toBe('ACTIVO');
      expect(updated.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('activar', () => {
    it('debe activar la placa asignándola al usuario con expiración y estado VENDIDO', () => {
      const original = PetTagAggregate.crear({
        id: 'id-1',
        idQr: 'qr-1',
        activationPin: 'A1B2C3',
      });

      const activated = original.activar('user-1', petData, expiration);

      expect(activated.status).toBe('ACTIVO');
      expect(activated.userId).toBe('user-1');
      expect(activated.petData).toEqual(petData);
      expect(activated.expiration).toEqual(expiration);
      expect(activated.commercialStatus).toBe('VENDIDO');
      expect(activated.updatedAt).toBeInstanceOf(Date);
      // La original permanece RESERVADO
      expect(original.status).toBe('RESERVADO');
      expect(original.userId).toBeNull();
    });
  });

  describe('serialización', () => {
    it('toSnapshot y toEntity deben retornar el mismo estado', () => {
      const tag = PetTagAggregate.crear({
        id: 'id-1',
        name: 'Placa',
        idQr: 'qr-1',
        activationPin: 'A1B2C3',
        status: 'ACTIVO',
        petData,
        expiration,
        commercialStatus: 'VENDIDO',
        isFavorite: true,
        assignedStoreName: 'Tienda',
      });

      expect(tag.toEntity()).toEqual(tag.toSnapshot());
      expect(tag.toSnapshot()).toMatchObject({
        id: 'id-1',
        idQr: 'qr-1',
        status: 'ACTIVO',
        commercialStatus: 'VENDIDO',
        isFavorite: true,
      });
    });
  });

  describe('getters', () => {
    it('debe exponer todos los valores de la placa', () => {
      const tag = PetTagAggregate.crear({
        id: 'id-1',
        name: 'Placa',
        idQr: 'qr-1',
        userId: 'user-1',
        activationPin: 'A1B2C3',
        status: 'ACTIVO',
        petData,
        expiration,
        commercialStatus: 'VENDIDO',
        isFavorite: true,
        assignedStoreName: 'Tienda',
      });

      expect(tag.id).toBe('id-1');
      expect(tag.name).toBe('Placa');
      expect(tag.idQr).toBe('qr-1');
      expect(tag.userId).toBe('user-1');
      expect(tag.activationPin).toBe('A1B2C3');
      expect(tag.status).toBe('ACTIVO');
      expect(tag.petData).toEqual(petData);
      expect(tag.expiration).toEqual(expiration);
      expect(tag.commercialStatus).toBe('VENDIDO');
      expect(tag.isFavorite).toBe(true);
      expect(tag.assignedStoreName).toBe('Tienda');
      expect(tag.createdAt).toBeInstanceOf(Date);
    });
  });
});