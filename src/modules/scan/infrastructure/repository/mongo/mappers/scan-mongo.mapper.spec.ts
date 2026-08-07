import { ScanMongoMapper } from './scan-mongo.mapper';
import type { Scan } from '../../../../domain/entities/scan.entity';

describe('ScanMongoMapper', () => {
  describe('toEntity', () => {
    it('debe mapear un documento con _id a entidad', () => {
      const doc = {
        _id: { toString: () => 'scan-id-1' },
        idQr: 'QR-1',
        scanDate: new Date('2025-01-01T12:00:00.000Z'),
        location: { latitude: -33.45, longitude: -70.66, country: 'CL', city: 'Santiago' },
        origen: 'web',
        device: { platform: 'Android', browser: 'Chrome', isMobile: true },
        successful: true,
        errorMessage: null,
        userIdScan: 'user-1',
        lastScanId: 'last-1',
        userId: 'user-1',
        createdAt: new Date('2025-01-01T12:00:00.000Z'),
        updatedAt: new Date('2025-01-01T12:00:00.000Z'),
      };

      const entity = ScanMongoMapper.toEntity(doc);

      expect(entity).toEqual({
        id: 'scan-id-1',
        idQr: 'QR-1',
        scanDate: doc.scanDate,
        location: doc.location,
        origen: 'web',
        device: doc.device,
        successful: true,
        errorMessage: null,
        userIdScan: 'user-1',
        lastScanId: 'last-1',
        userId: 'user-1',
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      });
    });

    it('debe usar id vacío cuando el documento no tiene _id', () => {
      const entity = ScanMongoMapper.toEntity({
        idQr: 'QR-2',
        scanDate: new Date('2025-01-02T10:00:00.000Z'),
        userId: 'user-2',
        successful: false,
        errorMessage: 'Error de red',
      });

      expect(entity.id).toBe('');
      expect(entity.idQr).toBe('QR-2');
      expect(entity.successful).toBe(false);
      expect(entity.errorMessage).toBe('Error de red');
    });
  });

  describe('toSchemaData', () => {
    it('debe mapear la entidad a datos de schema', () => {
      const scan: Scan = {
        id: 'scan-id-1',
        idQr: 'QR-1',
        scanDate: new Date('2025-01-01T12:00:00.000Z'),
        location: { latitude: -33.45, longitude: -70.66, country: 'CL', city: 'Santiago' },
        origen: 'web',
        device: { platform: 'Android', browser: 'Chrome', isMobile: true },
        successful: true,
        errorMessage: null,
        userIdScan: 'user-1',
        lastScanId: 'last-1',
        userId: 'user-1',
        createdAt: new Date('2025-01-01T12:00:00.000Z'),
        updatedAt: new Date('2025-01-01T12:00:00.000Z'),
      };

      const data = ScanMongoMapper.toSchemaData(scan);

      expect(data).toEqual({
        idQr: 'QR-1',
        scanDate: scan.scanDate,
        location: scan.location,
        origen: 'web',
        device: scan.device,
        successful: true,
        errorMessage: null,
        userIdScan: 'user-1',
        lastScanId: 'last-1',
        userId: 'user-1',
      });
    });

    it('debe mapear datos parciales sin campos opcionales', () => {
      const data = ScanMongoMapper.toSchemaData({
        idQr: 'QR-2',
        userId: 'user-2',
        successful: false,
      });

      expect(data).toEqual({
        idQr: 'QR-2',
        scanDate: undefined,
        location: undefined,
        origen: undefined,
        device: undefined,
        successful: false,
        errorMessage: undefined,
        userIdScan: undefined,
        lastScanId: undefined,
        userId: 'user-2',
      });
    });
  });
});