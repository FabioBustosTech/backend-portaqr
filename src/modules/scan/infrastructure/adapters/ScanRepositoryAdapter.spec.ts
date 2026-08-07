import { Test, TestingModule } from '@nestjs/testing';
import { ScanRepositoryAdapter } from './ScanRepositoryAdapter';
import { MongoScanRepository } from '../repository/mongo/mongo-scan.repository';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import type { Scan } from '../../domain/entities/scan.entity';

describe('ScanRepositoryAdapter', () => {
  let adapter: ScanRepositoryAdapter;
  let mongoRepository: jest.Mocked<MongoScanRepository>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const scan: Scan = {
    id: 'scan-id-1',
    idQr: 'QR-1',
    scanDate: new Date('2025-01-01T12:00:00.000Z'),
    origen: 'web',
    successful: true,
    userId: 'user-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScanRepositoryAdapter,
        {
          provide: MongoScanRepository,
          useValue: {
            create: jest.fn(),
            getStatsByQrId: jest.fn(),
            getDailyStats: jest.fn(),
            getDeviceStats: jest.fn(),
            getOriginStats: jest.fn(),
            getLocationStats: jest.fn(),
            getRecentScans: jest.fn(),
          },
        },
      ],
    }).compile();

    adapter = module.get(ScanRepositoryAdapter);
    mongoRepository = module.get(MongoScanRepository);
  });

  it('debe estar definido', () => {
    expect(adapter).toBeDefined();
  });

  describe('create', () => {
    it('debe delegar la creación al repositorio mongo', async () => {
      mongoRepository.create.mockResolvedValue(scan);

      const result = await adapter.create(scan, tracking);

      expect(mongoRepository.create).toHaveBeenCalledWith(scan, tracking);
      expect(result).toEqual(scan);
    });
  });

  describe('getStatsByQrId', () => {
    it('debe delegar la consulta de estadísticas al repositorio mongo', async () => {
      const stats = { totalScans: 10, scansByDay: [], deviceStats: [], locationStats: [], originStats: [] };
      mongoRepository.getStatsByQrId.mockResolvedValue(stats);

      const result = await adapter.getStatsByQrId('QR-1', tracking);

      expect(mongoRepository.getStatsByQrId).toHaveBeenCalledWith('QR-1', tracking);
      expect(result).toEqual(stats);
    });
  });

  describe('getDailyStats', () => {
    it('debe delegar la consulta de estadísticas diarias al repositorio mongo', async () => {
      const daily = [{ date: new Date('2025-01-01'), total: 5 }];
      mongoRepository.getDailyStats.mockResolvedValue(daily);

      const result = await adapter.getDailyStats('QR-1', 30, tracking);

      expect(mongoRepository.getDailyStats).toHaveBeenCalledWith('QR-1', 30, tracking);
      expect(result).toEqual(daily);
    });
  });

  describe('getDeviceStats', () => {
    it('debe delegar la consulta de estadísticas por dispositivo al repositorio mongo', async () => {
      const device = [{ platform: 'Android', browser: 'Chrome', isMobile: true, count: 8 }];
      mongoRepository.getDeviceStats.mockResolvedValue(device);

      const result = await adapter.getDeviceStats('QR-1', tracking);

      expect(mongoRepository.getDeviceStats).toHaveBeenCalledWith('QR-1', tracking);
      expect(result).toEqual(device);
    });
  });

  describe('getOriginStats', () => {
    it('debe delegar la consulta de estadísticas por origen al repositorio mongo', async () => {
      const origin = [{ origen: 'web', count: 6 }];
      mongoRepository.getOriginStats.mockResolvedValue(origin);

      const result = await adapter.getOriginStats('QR-1', tracking);

      expect(mongoRepository.getOriginStats).toHaveBeenCalledWith('QR-1', tracking);
      expect(result).toEqual(origin);
    });
  });

  describe('getLocationStats', () => {
    it('debe delegar la consulta de estadísticas por ubicación al repositorio mongo', async () => {
      const location = [{ country: 'Chile', city: 'Santiago', count: 4 }];
      mongoRepository.getLocationStats.mockResolvedValue(location);

      const result = await adapter.getLocationStats('QR-1', tracking);

      expect(mongoRepository.getLocationStats).toHaveBeenCalledWith('QR-1', tracking);
      expect(result).toEqual(location);
    });
  });

  describe('getRecentScans', () => {
    it('debe delegar la consulta de escaneos recientes al repositorio mongo', async () => {
      mongoRepository.getRecentScans.mockResolvedValue([scan]);

      const result = await adapter.getRecentScans('QR-1', 5, tracking);

      expect(mongoRepository.getRecentScans).toHaveBeenCalledWith('QR-1', 5, tracking);
      expect(result).toEqual([scan]);
    });
  });
});