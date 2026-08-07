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

const mockScanCountDocuments = jest.fn();
const mockQrCountDocuments = jest.fn();
const mockUserCountDocuments = jest.fn();
const mockQrAggregate = jest.fn();
const mockScanCreateIndex = jest.fn();
const mockQrCreateIndex = jest.fn();

const scanModelMock = {
  collection: { createIndex: mockScanCreateIndex },
  countDocuments: mockScanCountDocuments,
} as unknown as Model<_ScanDoc>;

const qrModelMock = {
  collection: { createIndex: mockQrCreateIndex },
  countDocuments: mockQrCountDocuments,
  aggregate: mockQrAggregate,
} as unknown as Model<_QrDoc>;

const userModelMock = {
  countDocuments: mockUserCountDocuments,
} as unknown as Model<_UserDoc>;

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
    it('debe calcular las estadísticas del usuario con countDocuments', async () => {
      mockScanCountDocuments
        .mockResolvedValueOnce(10) // total de escaneos
        .mockResolvedValueOnce(15) // escaneos del mes
        .mockResolvedValueOnce(20); // escaneos del día
      mockQrCountDocuments
        .mockResolvedValueOnce(3) // total de QRs
        .mockResolvedValueOnce(1); // QRs activos

      const result = await repository.getUserStatistics('user-1', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getUserStatistics:init',
        { userId: 'user-1' },
      );
      expect(mockScanCountDocuments).toHaveBeenNthCalledWith(1, { userId: 'user-1' }, { lean: true });
      expect(mockScanCountDocuments).toHaveBeenNthCalledWith(
        2,
        { userId: 'user-1', scanDate: { $gte: expect.any(Date) } },
        { lean: true },
      );
      expect(mockQrCountDocuments).toHaveBeenNthCalledWith(1, { userId: 'user-1' }, { lean: true });
      expect(mockQrCountDocuments).toHaveBeenNthCalledWith(
        2,
        { userId: 'user-1', active: true },
        { lean: true },
      );
      expect(result).toEqual({
        scans: { total: 10, monthly: 15, daily: 20 },
        qrs: { total: 3, active: 1 },
      });
    });

    it('debe trazar y re-lanzar el error si alguna consulta falla', async () => {
      mockScanCountDocuments.mockRejectedValue(new Error('DB down'));

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
    it('debe calcular las estadísticas del sistema', async () => {
      mockScanCountDocuments
        .mockResolvedValueOnce(100) // total de escaneos
        .mockResolvedValueOnce(50) // escaneos del mes
        .mockResolvedValueOnce(5); // escaneos del día
      mockQrCountDocuments
        .mockResolvedValueOnce(40) // total de QRs
        .mockResolvedValueOnce(15); // QRs activos
      mockUserCountDocuments.mockResolvedValueOnce(10); // total de usuarios
      mockQrAggregate.mockResolvedValue([{ total: 6 }]); // usuarios con QRs activos

      const result = await repository.getSystemStatistics(tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getSystemStatistics:init',
        {},
      );
      expect(mockScanCountDocuments).toHaveBeenNthCalledWith(1, {}, { lean: true });
      expect(mockQrCountDocuments).toHaveBeenNthCalledWith(2, { active: true }, { lean: true });
      expect(mockUserCountDocuments).toHaveBeenCalledWith({}, { lean: true });
      expect(mockQrAggregate).toHaveBeenCalledWith(
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
      mockScanCountDocuments
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockQrCountDocuments.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      mockUserCountDocuments.mockResolvedValueOnce(0);
      mockQrAggregate.mockResolvedValue([]);

      const result = await repository.getSystemStatistics(tracking);

      expect(result.users.active).toBe(0);
      expect(result.scans.total).toBe(0);
    });

    it('debe trazar y re-lanzar el error si alguna consulta falla', async () => {
      mockUserCountDocuments.mockRejectedValue(new Error('DB down'));

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