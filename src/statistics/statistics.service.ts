import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Scan } from '../scan/entities/scan.entity';
import { Qr } from '../qr/entities/qr.entity';
import { User } from 'src/users/entities/user.entity';
import { CustomLogger } from 'src/shared/utils/logger.util';

@Injectable()
export class StatisticsService {
  private readonly logger = new CustomLogger(StatisticsService.name);

  constructor(
    @InjectModel(Scan.name) private scanModel: Model<Scan>,
    @InjectModel(Qr.name) private qrModel: Model<Qr>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {
    // Crear Ã­ndices para optimizar las consultas
    this.scanModel.collection.createIndex({ userId: 1, scanDate: -1 });
    this.scanModel.collection.createIndex({ scanDate: -1 });
    this.scanModel.collection.createIndex({ origen: 1 });
    this.qrModel.collection.createIndex({ userId: 1, active: 1 });
  }

  async getUserStatistics(userId: string, trackingId: string) {
    this.logger.log(`Obteniendo estadÃ­sticas de usuario: ${userId}`, StatisticsService.name, 'getUserStatistics', trackingId);
    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const [
        totalScans,
        monthlyScans,
        dailyScans,
        totalQrs,
        activeQrs
      ] = await Promise.all([
        // Total de escaneos
        this.scanModel.countDocuments({ userId }, { lean: true }),
        
        // Escaneos del mes
        this.scanModel.countDocuments({
          userId,
          scanDate: { $gte: startOfMonth }
        }, { lean: true }),
        
        // Escaneos del dÃ­a
        this.scanModel.countDocuments({
          userId,
          scanDate: { $gte: startOfDay }
        }, { lean: true }),
        
        // Total de QRs creados
        this.qrModel.countDocuments({ userId }, { lean: true }),
        
        // QRs activos
        this.qrModel.countDocuments({ userId, active: true }, { lean: true })
      ]);

      return {
        scans: {
          total: totalScans,
          monthly: monthlyScans,
          daily: dailyScans
        },
        qrs: {
          total: totalQrs,
          active: activeQrs
        }
      };
    } catch (error) {
      this.logger.error(`Error al obtener estadÃ­sticas de usuario: ${error.message}`, error.stack, StatisticsService.name, 'getUserStatistics', trackingId);
      throw error;
    }
  }

  async getSystemStatistics(trackingId) {
    try {
      this.logger.log('Obteniendo estadÃ­sticas globales', StatisticsService.name, 'getSystemStatistics',trackingId);

      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const [
        totalScans,
        monthlyScans,
        dailyScans,
        totalQrs,
        activeQrs,
        totalUsers,
        activeUsers,
        scansByOrigin
      ] = await Promise.all([
        // Total de escaneos
        this.scanModel.countDocuments({}, { lean: true }),
        
        // Escaneos del mes
        this.scanModel.countDocuments({
          scanDate: { $gte: startOfMonth }
        }, { lean: true }),
        
        // Escaneos del dÃ­a
        this.scanModel.countDocuments({
          scanDate: { $gte: startOfDay }
        }, { lean: true }),
        
        // Total de QRs
        this.qrModel.countDocuments({}, { lean: true }),
        
        // QRs activos
        this.qrModel.countDocuments({ active: true }, { lean: true }),
        
        // Total de usuarios
        this.userModel.countDocuments({}, { lean: true }),
        
        // Escaneos por origen
        this.scanModel.aggregate([
          {
            $group: {
              _id: '$origen',
              count: { $sum: 1 }
            }
          },
          {
            $project: {
              _id: 0,
              origen: '$_id',
              count: 1
            }
          }
        ]).exec(),
        
        // Usuarios con QRs activos
        this.qrModel.aggregate([
          { $match: { active: true } },
          { $group: { _id: '$userId' } },
          { $count: 'total' }
        ]).then(result => result[0]?.total || 0)
      ]);

      return {
        scans: {
          total: totalScans,
          monthly: monthlyScans,
          daily: dailyScans
        },
        qrs: {
          total: totalQrs,
          active: activeQrs
        },
        users: {
          total: totalUsers,
          active: activeUsers
        }
      };
    } catch (error) {
      this.logger.error(`Error al obtener estadÃ­sticas globales: ${error.message}`, error.stack, StatisticsService.name, 'getSystemStatistics', trackingId);
      throw error;
    }
  }
} 