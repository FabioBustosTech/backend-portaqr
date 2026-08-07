import { QrFreeGenerationMongoMapper } from './qr-free-generation-mongo.mapper';
import type { QrFreeGeneration } from '../../../../domain/entities/qr-free-generation.entity';

describe('QrFreeGenerationMongoMapper', () => {
  describe('toEntity', () => {
    it('debe mapear un documento con _id a entidad', () => {
      const doc = {
        _id: { toString: () => 'qr-1' },
        email: 'user@example.com',
        information: { typeQr: 'TEXT', data: 'Hola' },
        location: {
          latitude: -33.4,
          longitude: -70.6,
          accuracy: 95,
          country: 'CL',
          city: 'Santiago',
        },
        device: { platform: 'web', browser: 'Chrome', isMobile: false },
        createdAt: new Date('2024-01-01'),
      };

      const entity = QrFreeGenerationMongoMapper.toEntity(doc);

      expect(entity).toEqual({
        id: 'qr-1',
        email: 'user@example.com',
        information: doc.information,
        location: doc.location,
        device: doc.device,
        createdAt: doc.createdAt,
      });
    });

    it('debe usar id vacío cuando el documento no tiene _id', () => {
      const entity = QrFreeGenerationMongoMapper.toEntity({
        email: 'user2@example.com',
        information: { typeQr: 'URL', data: 'https://x.cl' },
        createdAt: undefined,
      });

      expect(entity.id).toBe('');
      expect(entity.email).toBe('user2@example.com');
      expect(entity.location).toBeUndefined();
      expect(entity.device).toBeUndefined();
      expect(entity.createdAt).toBeUndefined();
    });
  });

  describe('toSchemaData', () => {
    it('debe mapear la entidad a datos de schema', () => {
      const qr: QrFreeGeneration = {
        id: 'qr-1',
        email: 'user@example.com',
        information: { typeQr: 'TEXT', data: 'Hola' },
        location: { latitude: -33.4, city: 'Santiago' },
        device: { platform: 'web', isMobile: true },
      };

      const data = QrFreeGenerationMongoMapper.toSchemaData(qr);

      expect(data).toEqual({
        email: 'user@example.com',
        information: qr.information,
        location: qr.location,
        device: qr.device,
      });
    });

    it('debe mapear datos parciales sin campos opcionales', () => {
      const data = QrFreeGenerationMongoMapper.toSchemaData({
        email: 'user2@example.com',
        information: { typeQr: 'URL', data: 'https://x.cl' },
      });

      expect(data).toEqual({
        email: 'user2@example.com',
        information: { typeQr: 'URL', data: 'https://x.cl' },
        location: undefined,
        device: undefined,
      });
    });
  });
});