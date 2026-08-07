import { QrMongoMapper } from './qr-mongo.mapper';
import type { Qr } from '../../../../domain/entities/qr.entity';

describe('QrMongoMapper', () => {
  describe('toEntity', () => {
    it('debe mapear un documento con _id a entidad', () => {
      const doc = {
        _id: { toString: () => 'qr-id-1' },
        idQr: 'QR-1',
        userId: 'user-1',
        expiration: new Date('2025-01-01T00:00:00.000Z'),
        quantityUpdateMonth: 2,
        description: 'QR de prueba',
        data: { typeQr: 'dynamic', url: 'https://ejemplo.cl' },
        name: 'Mi QR',
        updatedAt: new Date('2025-01-02T00:00:00.000Z'),
        active: true,
        isFavorite: false,
        isOldMode: false,
        typeQr: 'dynamic',
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      };

      const entity = QrMongoMapper.toEntity(doc);

      expect(entity).toEqual({
        id: 'qr-id-1',
        idQr: 'QR-1',
        userId: 'user-1',
        expiration: doc.expiration,
        quantityUpdateMonth: 2,
        description: 'QR de prueba',
        data: { typeQr: 'dynamic', url: 'https://ejemplo.cl' },
        name: 'Mi QR',
        updatedAt: doc.updatedAt,
        active: true,
        isFavorite: false,
        isOldMode: false,
        typeQr: 'dynamic',
        createdAt: doc.createdAt,
      });
    });

    it('debe usar id vacío cuando el documento no tiene _id', () => {
      const entity = QrMongoMapper.toEntity({
        idQr: 'QR-2',
        userId: 'user-2',
        data: { typeQr: 'whatsapp', whatsappUrl: 'https://wa.me/123' },
        typeQr: 'whatsapp',
      });

      expect(entity.id).toBe('');
      expect(entity.idQr).toBe('QR-2');
      expect(entity.typeQr).toBe('whatsapp');
    });
  });

  describe('toSchemaData', () => {
    it('debe mapear la entidad a datos de schema', () => {
      const qr: Qr = {
        id: 'qr-id-1',
        idQr: 'QR-1',
        userId: 'user-1',
        expiration: new Date('2025-01-01T00:00:00.000Z'),
        quantityUpdateMonth: 2,
        description: 'QR de prueba',
        data: { typeQr: 'dynamic', url: 'https://ejemplo.cl' },
        name: 'Mi QR',
        updatedAt: new Date('2025-01-02T00:00:00.000Z'),
        active: true,
        isFavorite: false,
        isOldMode: false,
        typeQr: 'dynamic',
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      };

      const data = QrMongoMapper.toSchemaData(qr);

      expect(data).toEqual({
        idQr: 'QR-1',
        userId: 'user-1',
        expiration: qr.expiration,
        quantityUpdateMonth: 2,
        description: 'QR de prueba',
        data: { typeQr: 'dynamic', url: 'https://ejemplo.cl' },
        name: 'Mi QR',
        active: true,
        isFavorite: false,
        isOldMode: false,
        typeQr: 'dynamic',
      });
    });

    it('debe mapear datos parciales sin campos opcionales', () => {
      const data = QrMongoMapper.toSchemaData({
        idQr: 'QR-2',
        userId: 'user-2',
        data: { typeQr: 'phone', phoneUrl: 'tel:+56912345678' },
        typeQr: 'phone',
      });

      expect(data).toEqual({
        idQr: 'QR-2',
        userId: 'user-2',
        expiration: undefined,
        quantityUpdateMonth: undefined,
        description: undefined,
        data: { typeQr: 'phone', phoneUrl: 'tel:+56912345678' },
        name: undefined,
        active: undefined,
        isFavorite: undefined,
        isOldMode: undefined,
        typeQr: 'phone',
      });
    });
  });
});