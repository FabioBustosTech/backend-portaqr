import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { Scan, ScanSchema } from 'src/scan/entities/scan.entity';
import { Qr, QrSchema } from 'src/qr/entities/qr.entity';
import { User, UserSchema } from 'src/users/entities/user.entity';
import type { ICanGetStatistics } from '../../../domain/ports/queries/statistics.port';
import type { UserStatistics, SystemStatistics } from '../../../domain/entities/statistics.entity';

@Injectable()
export class MongoStatisticsRepository implements ICanGetStatistics {
  private readonly logger = new Logger(MongoStatisticsRepository.name);

  constructor(
    @InjectModel(Scan.name) private readonly scanModel: Model<Scan>,
    @InjectModel(Qr.name) private readonly qrModel: Model<Qr>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly traceService: TraceService,
  ) {
    // Crear índices para optimizar las consultas
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

      const [totalScans, monthlyScans, dailyScans, totalQrs, activeQrs] =
        await Promise.all([
          // Total de escaneos
          this.scanModel.countDocuments({ userId }, { lean: true }),

          // Escaneos del mes
          this.scanModel.countDocuments(
            { userId, scanDate: { $gte: startOfMonth } },
            { lean: true },
          ),

          // Escaneos del día
          this.scanModel.countDocuments(
            { userId, scanDate: { $gte: startOfDay } },
            { lean: true },
          ),

          // Total de QRs creados
          this.qrModel.countDocuments({ userId }, { lean: true }),

          // QRs activos
          this.qrModel.countDocuments({ userId, active: true }, { lean: true }),
        ]);

      return {
        scans: {
          total: totalScans,
          monthly: monthlyScans,
          daily: dailyScans,
        },
        qrs: {
          total: totalQrs,
          active: activeQrs,
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

      const [totalScans, monthlyScans, dailyScans, totalQrs, activeQrs, totalUsers, activeUsers] =
        await Promise.all([
          // Total de escaneos
          this.scanModel.countDocuments({}, { lean: true }),

          // Escaneos del mes
          this.scanModel.countDocuments({ scanDate: { $gte: startOfMonth } }, { lean: true }),

          // Escaneos del día
          this.scanModel.countDocuments({ scanDate: { $gte: startOfDay } }, { lean: true }),

          // Total de QRs
          this.qrModel.countDocuments({}, { lean: true }),

          // QRs activos
          this.qrModel.countDocuments({ active: true }, { lean: true }),

          // Total de usuarios
          this.userModel.countDocuments({}, { lean: true }),

          // Usuarios con QRs activos
          this.qrModel
            .aggregate([{ $match: { active: true } }, { $group: { _id: '$userId' } }, { $count: 'total' }])
            .then((result) => result[0]?.total || 0),
        ]);

      return {
        scans: {
          total: totalScans,
          monthly: monthlyScans,
          daily: dailyScans,
        },
        qrs: {
          total: totalQrs,
          active: activeQrs,
        },
        users: {
          total: totalUsers,
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
