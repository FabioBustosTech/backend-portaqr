import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { ScanSchema, ScanDocument as _ScanDoc } from 'src/modules/scan/infrastructure/repository/mongo/schemas/scan.schema';
import { QrSchema, QrDocument as _QrDoc } from 'src/modules/qr/infrastructure/repository/mongo/schemas/qr.schema';
import { UserSchema, UserDocument as _UserDoc } from 'src/modules/users/infrastructure/repository/mongo/schemas/user.schema';
import type { ICanGetStatistics } from '../../../domain/ports/queries/statistics.port';
import type { UserStatistics, SystemStatistics } from '../../../domain/entities/statistics.entity';

@Injectable()
export class MongoStatisticsRepository implements ICanGetStatistics {
  private readonly logger = new Logger(MongoStatisticsRepository.name);

  constructor(
    @InjectModel(ScanSchema.name) private readonly scanModel: Model<_ScanDoc>,
    @InjectModel(QrSchema.name) private readonly qrModel: Model<_QrDoc>,
    @InjectModel(UserSchema.name) private readonly userModel: Model<_UserDoc>,
    private readonly traceService: TraceService,
  ) {
    // Crear Ã­ndices para optimizar las consultas
    this.scanModel.collection.createIndex({ userId: 1, scanDate: -1 });
    this.scanModel.collection.createIndex({ scanDate: -1 });
    this.scanModel.collection.createIndex({ origen: 1 });
    this.qrModel.collection.createIndex({ userId: 1, active: 1 });
  }

  async getUserStatistics(userId: string, tracking: TrackingContext): Promise<UserStatistics> {
    try {
      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'getUserStatistics:init', {
        userId,
      });

      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // SPEC-007 H4: 1 aggregate $facet por colección (2 consultas totales)
      const [scanStats, qrStats] = await Promise.all([
        this.scanModel
          .aggregate([
            { $match: { userId } },
            {
              $facet: {
                total: [{ $count: 'v' }],
                monthly: [{ $match: { scanDate: { $gte: startOfMonth } } }, { $count: 'v' }],
                daily: [{ $match: { scanDate: { $gte: startOfDay } } }, { $count: 'v' }],
              },
            },
          ])
          .exec(),
        this.qrModel
          .aggregate([
            { $match: { userId } },
            {
              $facet: {
                total: [{ $count: 'v' }],
                active: [{ $match: { active: true } }, { $count: 'v' }],
              },
            },
          ])
          .exec(),
      ]);

      const scanFacet = scanStats[0] ?? {};
      const qrFacet = qrStats[0] ?? {};

      return {
        scans: {
          total: scanFacet.total?.[0]?.v ?? 0,
          monthly: scanFacet.monthly?.[0]?.v ?? 0,
          daily: scanFacet.daily?.[0]?.v ?? 0,
        },
        qrs: {
          total: qrFacet.total?.[0]?.v ?? 0,
          active: qrFacet.active?.[0]?.v ?? 0,
        },
      };
    } catch (error) {
      this.traceService.error(
        tracking,
        TraceLayer.REPOSITORY,
        'getUserStatistics:error',
        error as Error,
      );
      throw error;
    }
  }

  async getSystemStatistics(tracking: TrackingContext): Promise<SystemStatistics> {
    try {
      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'getSystemStatistics:init', {});

      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // SPEC-007 H4: 1 aggregate $facet por colección (3 consultas + activeUsers ya optimizado)
      const [scanStats, qrStats, userStats, activeUsers] = await Promise.all([
        this.scanModel
          .aggregate([
            { $match: {} },
            {
              $facet: {
                total: [{ $count: 'v' }],
                monthly: [{ $match: { scanDate: { $gte: startOfMonth } } }, { $count: 'v' }],
                daily: [{ $match: { scanDate: { $gte: startOfDay } } }, { $count: 'v' }],
              },
            },
          ])
          .exec(),
        this.qrModel
          .aggregate([
            { $match: {} },
            {
              $facet: {
                total: [{ $count: 'v' }],
                active: [{ $match: { active: true } }, { $count: 'v' }],
              },
            },
          ])
          .exec(),
        this.userModel
          .aggregate([
            { $match: {} },
            { $facet: { total: [{ $count: 'v' }] } },
          ])
          .exec(),
        // Usuarios con QRs activos (aggregate de distinct userId — ya optimizado)
        this.qrModel
          .aggregate([{ $match: { active: true } }, { $group: { _id: '$userId' } }, { $count: 'total' }])
          .exec()
          .then((result) => result[0]?.total || 0),
      ]);

      const scanFacet = scanStats[0] ?? {};
      const qrFacet = qrStats[0] ?? {};
      const userFacet = userStats[0] ?? {};

      return {
        scans: {
          total: scanFacet.total?.[0]?.v ?? 0,
          monthly: scanFacet.monthly?.[0]?.v ?? 0,
          daily: scanFacet.daily?.[0]?.v ?? 0,
        },
        qrs: {
          total: qrFacet.total?.[0]?.v ?? 0,
          active: qrFacet.active?.[0]?.v ?? 0,
        },
        users: {
          total: userFacet.total?.[0]?.v ?? 0,
          active: activeUsers,
        },
      };
    } catch (error) {
      this.traceService.error(
        tracking,
        TraceLayer.REPOSITORY,
        'getSystemStatistics:error',
        error as Error,
      );
      throw error;
    }
  }
}
