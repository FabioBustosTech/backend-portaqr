import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoStatisticsRepository } from './mongo-statistics.repository';
import {
  ScanSchema,
  ScanDocument as _ScanDoc,
} from 'src/modules/scan/infrastructure/repository/mongo/schemas/scan.schema';
import {
  QrSchema,
  QrDocument as _QrDoc,
} from 'src/modules/qr/infrastructure/repository/mongo/schemas/qr.schema';
import {
  UserSchema,
  UserDocument as _UserDoc,
} from 'src/modules/users/infrastructure/repository/mongo/schemas/user.schema';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';

const mockScanAggregate = jest.fn();
const mockQrAggregate = jest.fn();
const mockUserAggregate = jest.fn();
const mockScanCreateIndex = jest.fn();
const mockQrCreateIndex = jest.fn();

const scanModelMock = {
  collection: { createIndex: mockScanCreateIndex },
  aggregate: mockScanAggregate,
} as unknown as Model<_ScanDoc>;

const qrModelMock = {
  collection: { createIndex: mockQrCreateIndex },
  aggregate: mockQrAggregate,
} as unknown as Model<_QrDoc>;

const userModelMock = {
  aggregate: mockUserAggregate,
} as unknown as Model<_UserDoc>;

/** Crea un resultado de aggregate con $facet: [{ facetKey: [{v: N}], ... }] con .exec() */
const createFacetAggregateResult = (facet: Record<string, number>): { exec: jest.Mock } => {
  const row: Record<string, Array<{ v: number }>> = {};
  for (const [key, value] of Object.entries(facet)) {
    row[key] = [{ v: value }];
  }
  return { exec: jest.fn().mockResolvedValue([row]) };
};

describe('MongoStatisticsRepository', () => {
  let repository: MongoStatisticsRepository;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongoStatisticsRepository,
        {
          provide: getModelToken(ScanSchema.name),
          useValue: scanModelMock,
        },
        {
          provide: getModelToken(QrSchema.name),
          useValue: qrModelMock,
        },
        {
          provide: getModelToken(UserSchema.name),
          useValue: userModelMock,
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

    repository = module.get(MongoStatisticsRepository);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(repository).toBeDefined();
  });

  it('debe crear los índices de optimización al inicializar', () => {
    expect(mockScanCreateIndex).toHaveBeenCalledTimes(3);
    expect(mockQrCreateIndex).toHaveBeenCalledTimes(1);
  });

  describe('getUserStatistics', () => {
    it('debe calcular las estadísticas del usuario con 1 aggregate $facet por colección (2 consultas)', async () => {
      mockScanAggregate.mockReturnValue(
        createFacetAggregateResult({ total: 10, monthly: 15, daily: 20 }),
      );
      mockQrAggregate.mockReturnValue(createFacetAggregateResult({ total: 3, active: 1 }));

      const result = await repository.getUserStatistics('user-1', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getUserStatistics:init',
        { userId: 'user-1' },
      );
      // 2 aggregates totales (scan + qr), no 5 countDocuments
      expect(mockScanAggregate).toHaveBeenCalledTimes(1);
      expect(mockQrAggregate).toHaveBeenCalledTimes(1);
      expect(mockScanAggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ $match: { userId: 'user-1' } }),
          expect.objectContaining({ $facet: expect.any(Object) }),
        ]),
      );
      expect(mockQrAggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ $match: { userId: 'user-1' } }),
          expect.objectContaining({ $facet: expect.any(Object) }),
        ]),
      );
      expect(result).toEqual({
        scans: { total: 10, monthly: 15, daily: 20 },
        qrs: { total: 3, active: 1 },
      });
    });

    it('debe usar fechas de corte en los facet monthly/daily', async () => {
      mockScanAggregate.mockReturnValue(
        createFacetAggregateResult({ total: 10, monthly: 15, daily: 20 }),
      );
      mockQrAggregate.mockReturnValue(createFacetAggregateResult({ total: 3, active: 1 }));

      await repository.getUserStatistics('user-1', tracking);

      const scanPipeline = mockScanAggregate.mock.calls[0][0] as Array<Record<string, unknown>>;
      const scanFacet = scanPipeline.find((s) => s.$facet)?.$facet as Record<string, unknown>;
      expect(scanFacet.monthly).toEqual([
        { $match: { scanDate: { $gte: expect.any(Date) } } },
        { $count: 'v' },
      ]);
      expect(scanFacet.daily).toEqual([
        { $match: { scanDate: { $gte: expect.any(Date) } } },
        { $count: 'v' },
      ]);
      const qrPipeline = mockQrAggregate.mock.calls[0][0] as Array<Record<string, unknown>>;
      const qrFacet = qrPipeline.find((s) => s.$facet)?.$facet as Record<string, unknown>;
      expect(qrFacet.active).toEqual([
        { $match: { active: true } },
        { $count: 'v' },
      ]);
    });

    it('debe retornar 0s cuando no hay documentos (facet vacío)', async () => {
      mockScanAggregate.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
      mockQrAggregate.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });

      const result = await repository.getUserStatistics('user-1', tracking);

      expect(result).toEqual({
        scans: { total: 0, monthly: 0, daily: 0 },
        qrs: { total: 0, active: 0 },
      });
    });

    it('debe trazar y re-lanzar el error si alguna consulta falla', async () => {
      mockScanAggregate.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DB down')),
      });

      await expect(repository.getUserStatistics('user-1', tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getUserStatistics:error',
        expect.any(Error),
      );
    });
  });

  describe('getSystemStatistics', () => {
    it('debe calcular las estadísticas del sistema con 3 aggregates $facet + activeUsers', async () => {
      mockScanAggregate.mockReturnValue(
        createFacetAggregateResult({ total: 100, monthly: 50, daily: 5 }),
      );
      mockQrAggregate.mockReturnValue(createFacetAggregateResult({ total: 40, active: 15 }));
      mockUserAggregate.mockReturnValue(createFacetAggregateResult({ total: 10 }));
      // activeUsers: aggregate de distinct userId
      mockQrAggregate.mockReturnValueOnce(
        createFacetAggregateResult({ total: 40, active: 15 }),
      );
      mockQrAggregate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([{ total: 6 }]),
      });

      const result = await repository.getSystemStatistics(tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getSystemStatistics:init',
        {},
      );
      // 3 aggregates con $facet (scan, qr, user) + 1 aggregate distinct (activeUsers)
      expect(mockScanAggregate).toHaveBeenCalledTimes(1);
      expect(mockQrAggregate).toHaveBeenCalledTimes(2);
      expect(mockUserAggregate).toHaveBeenCalledTimes(1);
      expect(mockQrAggregate).toHaveBeenNthCalledWith(
        2,
        expect.arrayContaining([
          expect.objectContaining({ $match: { active: true } }),
          expect.objectContaining({ $group: { _id: '$userId' } }),
        ]),
      );
      expect(result).toEqual({
        scans: { total: 100, monthly: 50, daily: 5 },
        qrs: { total: 40, active: 15 },
        users: { total: 10, active: 6 },
      });
    });

    it('debe considerar 0 usuarios activos cuando el aggregate no retorna total', async () => {
      mockScanAggregate.mockReturnValue(createFacetAggregateResult({ total: 0, monthly: 0, daily: 0 }));
      mockQrAggregate.mockReturnValue(createFacetAggregateResult({ total: 0, active: 0 }));
      mockUserAggregate.mockReturnValue(createFacetAggregateResult({ total: 0 }));
      mockQrAggregate.mockReturnValueOnce(createFacetAggregateResult({ total: 0, active: 0 }));
      mockQrAggregate.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue([]) });

      const result = await repository.getSystemStatistics(tracking);

      expect(result.users.active).toBe(0);
      expect(result.scans.total).toBe(0);
    });

    it('debe trazar y re-lanzar el error si alguna consulta falla', async () => {
      mockUserAggregate.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DB down')),
      });

      await expect(repository.getSystemStatistics(tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getSystemStatistics:error',
        expect.any(Error),
      );
    });
  });
});
