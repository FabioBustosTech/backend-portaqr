import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoScanRepository } from './mongo-scan.repository';
import { ScanSchema, ScanDocument } from './schemas/scan.schema';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import type { Scan } from '../../../domain/entities/scan.entity';

const mockSave = jest.fn();
const mockFind = jest.fn();
const mockCountDocuments = jest.fn();
const mockAggregate = jest.fn();

const scanModelMock = jest.fn().mockImplementation((data: Record<string, unknown>) => ({
  ...data,
  save: mockSave,
})) as unknown as Model<ScanDocument>;

(scanModelMock as unknown as Record<string, unknown>).find = mockFind;
(scanModelMock as unknown as Record<string, unknown>).countDocuments = mockCountDocuments;
(scanModelMock as unknown as Record<string, unknown>).aggregate = mockAggregate;

/** Crea un mock de query encadenable (sort/limit/select/lean/exec) */
const createQueryMock = (result: unknown, reject = false) => {
  const exec = reject
    ? jest.fn().mockRejectedValue(result)
    : jest.fn().mockResolvedValue(result);
  const query = {
    exec,
    sort: jest.fn(),
    limit: jest.fn(),
    select: jest.fn(),
    lean: jest.fn(),
  };
  query.sort.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.lean.mockReturnValue(query);
  return query;
};

describe('MongoScanRepository', () => {
  let repository: MongoScanRepository;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const scanDoc = {
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

  const scan: Scan = {
    id: 'scan-id-1',
    idQr: 'QR-1',
    scanDate: scanDoc.scanDate,
    location: scanDoc.location,
    origen: 'web',
    device: scanDoc.device,
    successful: true,
    errorMessage: null,
    userIdScan: 'user-1',
    lastScanId: 'last-1',
    userId: 'user-1',
    createdAt: scanDoc.createdAt,
    updatedAt: scanDoc.updatedAt,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongoScanRepository,
        {
          provide: getModelToken(ScanSchema.name),
          useValue: scanModelMock,
        },
        {
          provide: TraceService,
          useValue: {
            log: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get(MongoScanRepository);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('debe crear el documento con el mapper y retornar la entidad mapeada', async () => {
      mockSave.mockResolvedValue(scanDoc);

      const result = await repository.create(scan, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'create:init',
        { idQr: 'QR-1' },
      );
      expect(scanModelMock).toHaveBeenCalledWith(
        expect.objectContaining({
          idQr: 'QR-1',
          userId: 'user-1',
          successful: true,
        }),
      );
      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(result).toEqual(scan);
    });

    it('debe trazar y re-lanzar el error si el guardado falla', async () => {
      mockSave.mockRejectedValue(new Error('DB down'));

      await expect(repository.create(scan, tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'create:error',
        expect.any(Error),
      );
    });
  });

  describe('getStatsByQrId', () => {
    it('debe combinar totales y estadísticas por día, dispositivo, ubicación y origen', async () => {
      mockCountDocuments.mockResolvedValue(10);
      mockAggregate.mockResolvedValue([{ date: new Date('2025-01-01'), total: 5 }]);

      const result = await repository.getStatsByQrId('QR-1', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getStatsByQrId:init',
        { idQr: 'QR-1' },
      );
      expect(mockCountDocuments).toHaveBeenCalledWith({ idQr: 'QR-1' });
      expect(mockAggregate).toHaveBeenCalledTimes(4);
      expect(result).toEqual({
        totalScans: 10,
        scansByDay: [{ date: new Date('2025-01-01'), total: 5 }],
        deviceStats: [{ date: new Date('2025-01-01'), total: 5 }],
        locationStats: [{ date: new Date('2025-01-01'), total: 5 }],
        originStats: [{ date: new Date('2025-01-01'), total: 5 }],
      });
    });

    it('debe trazar y re-lanzar el error si alguna consulta falla', async () => {
      mockAggregate.mockRejectedValue(new Error('DB down'));

      await expect(repository.getStatsByQrId('QR-1', tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getStatsByQrId:error',
        expect.any(Error),
      );
    });
  });

  describe('getDailyStats', () => {
    it('debe ejecutar el aggregate con filtro por fecha y retornar el resultado', async () => {
      mockAggregate.mockResolvedValue([
        { date: new Date('2025-01-01'), total: 5, successful: 4, errors: 1 },
      ]);

      const result = await repository.getDailyStats('QR-1', 30, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getDailyStats:init',
        { idQr: 'QR-1', days: 30 },
      );
      expect(mockAggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({ idQr: 'QR-1' }),
          }),
        ]),
      );
      expect(result).toEqual([
        { date: new Date('2025-01-01'), total: 5, successful: 4, errors: 1 },
      ]);
    });

    it('debe usar 30 días por defecto cuando no se entrega days', async () => {
      mockAggregate.mockResolvedValue([]);

      const result = await repository.getDailyStats('QR-1', undefined, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getDailyStats:init',
        { idQr: 'QR-1', days: 30 },
      );
      expect(result).toEqual([]);
    });

    it('debe trazar y re-lanzar el error si el aggregate falla', async () => {
      mockAggregate.mockRejectedValue(new Error('DB down'));

      await expect(repository.getDailyStats('QR-1', 30, tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getDailyStats:error',
        expect.any(Error),
      );
    });
  });

  describe('getDeviceStats', () => {
    it('debe devolver el resultado del aggregate por dispositivo', async () => {
      mockAggregate.mockResolvedValue([
        { platform: 'Android', browser: 'Chrome', isMobile: true, count: 8 },
      ]);

      const result = await repository.getDeviceStats('QR-1', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getDeviceStats:init',
        { idQr: 'QR-1' },
      );
      expect(mockAggregate).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ $match: { idQr: 'QR-1' } })]),
      );
      expect(result).toEqual([
        { platform: 'Android', browser: 'Chrome', isMobile: true, count: 8 },
      ]);
    });

    it('debe trazar y re-lanzar el error si el aggregate falla', async () => {
      mockAggregate.mockRejectedValue(new Error('DB down'));

      await expect(repository.getDeviceStats('QR-1', tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getDeviceStats:error',
        expect.any(Error),
      );
    });
  });

  describe('getOriginStats', () => {
    it('debe devolver el resultado del aggregate por origen', async () => {
      mockAggregate.mockResolvedValue([{ origen: 'web', count: 6 }]);

      const result = await repository.getOriginStats('QR-1', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getOriginStats:init',
        { idQr: 'QR-1' },
      );
      expect(mockAggregate).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ $match: { idQr: 'QR-1' } })]),
      );
      expect(result).toEqual([{ origen: 'web', count: 6 }]);
    });

    it('debe trazar y re-lanzar el error si el aggregate falla', async () => {
      mockAggregate.mockRejectedValue(new Error('DB down'));

      await expect(repository.getOriginStats('QR-1', tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getOriginStats:error',
        expect.any(Error),
      );
    });
  });

  describe('getLocationStats', () => {
    it('debe devolver el resultado del aggregate por ubicación', async () => {
      mockAggregate.mockResolvedValue([
        {
          country: 'Chile',
          city: 'Santiago',
          count: 4,
          centerPoint: { latitude: -33.45, longitude: -70.66 },
        },
      ]);

      const result = await repository.getLocationStats('QR-1', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getLocationStats:init',
        { idQr: 'QR-1' },
      );
      expect(mockAggregate).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ $match: { idQr: 'QR-1' } })]),
      );
      expect(result).toEqual([
        {
          country: 'Chile',
          city: 'Santiago',
          count: 4,
          centerPoint: { latitude: -33.45, longitude: -70.66 },
        },
      ]);
    });

    it('debe trazar y re-lanzar el error si el aggregate falla', async () => {
      mockAggregate.mockRejectedValue(new Error('DB down'));

      await expect(repository.getLocationStats('QR-1', tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getLocationStats:error',
        expect.any(Error),
      );
    });
  });

  describe('getRecentScans', () => {
    it('debe retornar los escaneos recientes mapeados', async () => {
      mockFind.mockReturnValue(createQueryMock([scanDoc]));

      const result = await repository.getRecentScans('QR-1', 5, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getRecentScans:init',
        { idQr: 'QR-1', limit: 5 },
      );
      expect(mockFind).toHaveBeenCalledWith({ idQr: 'QR-1' });
      expect(result).toEqual([scan]);
    });

    it('debe usar 10 como límite por defecto', async () => {
      mockFind.mockReturnValue(createQueryMock([]));

      const result = await repository.getRecentScans('QR-1', undefined, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getRecentScans:init',
        { idQr: 'QR-1', limit: 10 },
      );
      expect(result).toEqual([]);
    });

    it('debe trazar y re-lanzar el error si la consulta falla', async () => {
      mockFind.mockReturnValue(createQueryMock(new Error('DB down'), true));

      await expect(repository.getRecentScans('QR-1', 5, tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getRecentScans:error',
        expect.any(Error),
      );
    });
  });
});