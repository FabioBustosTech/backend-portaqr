import { PetTagMongoMapper } from './pet-tag-mongo.mapper';
import { Types } from 'mongoose';
import type { PetTag } from '../../../../domain/entities/pet-tag.entity';

describe('PetTagMongoMapper', () => {
  describe('toEntity', () => {
    it('debe mapear un documento con _id, userId y petData a entidad', () => {
      const userId = new Types.ObjectId('507f1f77bcf86cd799439011');
      const doc = {
        _id: { toString: () => 'tag-1' },
        name: 'Rex',
        idQr: 'qr-1',
        userId,
        activationPin: 'PIN-1',
        status: 'ACTIVO',
        petData: {
          ownerName: 'Juan',
          address: 'Calle 1',
          phone: '123',
          petName: 'Rex',
          birthDate: '2020-01-01',
          breed: 'Labrador',
          gender: 'M',
          species: 'Perro',
          dietFrequency: '2 veces',
          diseases: 'Ninguna',
          vaccines: [{ name: 'Rabia', date: '2024-01-01' }],
          observations: 'Ninguna',
          petImageUrl: 'https://cdn/pet-tag/qr-1.webp',
        },
        expiration: new Date('2025-01-01'),
        commercialStatus: 'VENDIDO',
        isFavorite: true,
        assignedStoreName: 'Tienda',
        activationAttempts: 0,
        activationLockedUntil: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      const entity = PetTagMongoMapper.toEntity(doc);

      expect(entity).toEqual({
        id: 'tag-1',
        name: 'Rex',
        idQr: 'qr-1',
        userId: '507f1f77bcf86cd799439011',
        activationPin: 'PIN-1',
        status: 'ACTIVO',
        petData: {
          ownerName: 'Juan',
          address: 'Calle 1',
          phone: '123',
          petName: 'Rex',
          birthDate: '2020-01-01',
          breed: 'Labrador',
          gender: 'M',
          species: 'Perro',
          dietFrequency: '2 veces',
          diseases: 'Ninguna',
          vaccines: [{ name: 'Rabia', date: '2024-01-01' }],
          observations: 'Ninguna',
          petImageUrl: 'https://cdn/pet-tag/qr-1.webp',
        },
        expiration: doc.expiration,
        commercialStatus: 'VENDIDO',
        isFavorite: true,
        assignedStoreName: 'Tienda',
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      });
    });

    it('debe usar id vacío, userId null y petData null cuando el documento no los tiene', () => {
      const entity = PetTagMongoMapper.toEntity({
        idQr: 'qr-2',
        userId: null,
        activationPin: 'PIN-2',
        status: 'RESERVADO',
        petData: null,
        expiration: null,
        commercialStatus: 'EN_BODEGA',
        isFavorite: false,
        activationAttempts: 0,
        activationLockedUntil: null,
        assignedStoreName: null,
      });

      expect(entity.id).toBe('');
      expect(entity.userId).toBeNull();
      expect(entity.petData).toBeNull();
      expect(entity.expiration).toBeNull();
    });
  });

  describe('toPetDataEntity', () => {
    it('debe mapear un documento de petData completo a entidad', () => {
      const doc = {
        ownerName: 'Juan',
        address: 'Calle 1',
        phone: '123',
        petName: 'Rex',
        birthDate: '2020-01-01',
        breed: 'Labrador',
        gender: 'M',
        species: 'Perro',
        dietFrequency: '2 veces',
        diseases: 'Ninguna',
        vaccines: [{ name: 'Rabia', date: '2024-01-01' }],
        observations: 'Ninguna',
        petImageUrl: 'https://cdn/pet-tag/qr-1.webp',
      };

      const entity = PetTagMongoMapper.toPetDataEntity(doc);

      expect(entity).toEqual(doc);
    });

    it('debe mapear petImageUrl como null cuando el documento no lo trae', () => {
      const entity = PetTagMongoMapper.toPetDataEntity({
        ownerName: 'Juan',
        address: 'Calle 1',
        phone: '123',
        petName: 'Rex',
      });

      expect(entity.petImageUrl).toBeNull();
    });

    it('debe mapear datos parciales sin campos opcionales', () => {
      const entity = PetTagMongoMapper.toPetDataEntity({
        ownerName: 'Juan',
        address: 'Calle 1',
        phone: '123',
        petName: 'Rex',
      });

      expect(entity).toEqual({
        ownerName: 'Juan',
        address: 'Calle 1',
        phone: '123',
        petName: 'Rex',
        petImageUrl: null,
      });
    });
  });

  describe('toSchemaData', () => {
    it('debe mapear la entidad a datos de schema', () => {
      const tag: PetTag = {
        id: 'tag-1',
        name: 'Rex',
        idQr: 'qr-1',
        userId: 'user-1',
        activationPin: 'PIN-1',
        status: 'ACTIVO',
        petData: {
          ownerName: 'Ana',
          address: 'Calle 2',
          phone: '456',
          petName: 'Luna',
        },
        expiration: new Date('2025-01-01'),
        commercialStatus: 'VENDIDO',
        isFavorite: true,
        assignedStoreName: 'Tienda',
      };

      const data = PetTagMongoMapper.toSchemaData(tag);

      expect(data).toEqual({
        name: 'Rex',
        idQr: 'qr-1',
        userId: 'user-1',
        activationPin: 'PIN-1',
        status: 'ACTIVO',
        petData: tag.petData,
        expiration: tag.expiration,
        commercialStatus: 'VENDIDO',
        isFavorite: true,
        assignedStoreName: 'Tienda',
      });
    });

    it('debe usar null cuando userId no está presente', () => {
      const data = PetTagMongoMapper.toSchemaData({
        idQr: 'qr-2',
        userId: null,
        activationPin: 'PIN-2',
        status: 'RESERVADO',
        petData: null,
        expiration: null,
        commercialStatus: 'EN_BODEGA',
        isFavorite: false,
        assignedStoreName: null,
      });

      expect(data.userId).toBeNull();
      expect(data.petData).toBeNull();
    });
  });
});