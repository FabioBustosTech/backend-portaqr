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
describe('QrMongoMapper � listImageUrl (SPEC-002)', () => {
  it('toEntity preserva data.listImageUrl', () => {
    const doc: any = {
      _id: { toString: () => 'qr-id-3' },
      idQr: 'QR-3',
      userId: 'user-3',
      data: {
        typeQr: 'list',
        urlList: [{ typeUrl: 'web', url: 'https://a.cl' }],
        listImageUrl: 'https://images.portaqr.cl/qr-multilink/QR-3.webp',
      },
      typeQr: 'list',
    };

    const entity = QrMongoMapper.toEntity(doc);

    expect(entity.data.listImageUrl).toBe('https://images.portaqr.cl/qr-multilink/QR-3.webp');
  });

  it('toSchemaData incluye data con listImageUrl', () => {
    const entity: Partial<Qr> = {
      idQr: 'QR-4',
      userId: 'user-4',
      data: {
        typeQr: 'list',
        urlList: [{ typeUrl: 'web', url: 'https://b.cl' }],
        listImageUrl: 'https://images.portaqr.cl/qr-multilink/QR-4.webp',
      },
      typeQr: 'list',
    };

    const schemaData = QrMongoMapper.toSchemaData(entity);

    expect(schemaData.data).toEqual(entity.data);
  });
});

describe('QrMongoMapper — itemId al vuelo en urlList (SPEC-005 RF-12)', () => {
  it('genera un itemId UUID a cada item sin itemId (pre-SPEC-005)', () => {
    const doc: any = {
      _id: { toString: () => 'qr-id-5' },
      idQr: 'QR-5',
      userId: 'user-5',
      data: {
        typeQr: 'list',
        urlList: [
          { typeUrl: 'web', url: 'https://a.cl' },
          { typeUrl: 'vcard', vcard: { nombre: 'A' } },
        ],
      },
      typeQr: 'list',
    };

    const entity = QrMongoMapper.toEntity(doc);

    expect(entity.data.urlList).toHaveLength(2);
    for (const item of entity.data.urlList!) {
      expect(typeof item.itemId).toBe('string');
      expect(item.itemId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    }
    // Los items originales no fueron mutados (copia de data)
    expect((doc.data.urlList[0] as { itemId?: string }).itemId).toBeUndefined();
    expect(entity.data.urlList![0].itemId).not.toBe(entity.data.urlList![1].itemId);
  });

  it('preserva el itemId existente (no lo regenera)', () => {
    const doc: any = {
      _id: { toString: () => 'qr-id-6' },
      idQr: 'QR-6',
      userId: 'user-6',
      data: {
        typeQr: 'list',
        urlList: [
          { itemId: 'item-fijo-1', typeUrl: 'pdf', documentUrl: 'https://x.cl/qr-multilink-pdf/QR-6-item-fijo-1.pdf' },
          { itemId: 'item-fijo-2', typeUrl: 'web', url: 'https://b.cl' },
        ],
      },
      typeQr: 'list',
    };

    const entity = QrMongoMapper.toEntity(doc);

    expect(entity.data.urlList![0].itemId).toBe('item-fijo-1');
    expect(entity.data.urlList![1].itemId).toBe('item-fijo-2');
  });

  it('no altera data cuando urlList está ausente', () => {
    const doc: any = {
      _id: { toString: () => 'qr-id-7' },
      idQr: 'QR-7',
      userId: 'user-7',
      data: { typeQr: 'dynamic', url: 'https://c.cl' },
      typeQr: 'dynamic',
    };

    const entity = QrMongoMapper.toEntity(doc);

    expect(entity.data).toEqual({ typeQr: 'dynamic', url: 'https://c.cl' });
  });

  it('no altera data cuando data está ausente', () => {
    const doc: any = {
      _id: { toString: () => 'qr-id-8' },
      idQr: 'QR-8',
      userId: 'user-8',
      typeQr: 'static',
    };

    const entity = QrMongoMapper.toEntity(doc);

    expect(entity.data).toBeUndefined();
  });
});
