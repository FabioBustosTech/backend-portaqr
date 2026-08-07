import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Scan } from './entities/scan.entity';
import { CreateScanDto } from './dto/create-scan.dto';
import { CustomLogger } from 'src/shared/utils/logger.util';

@Injectable()
export class ScanService {
  private readonly logger = new CustomLogger(ScanService.name);

  constructor(
    @InjectModel(Scan.name) private scanModel: Model<Scan>,
  ) {}

  async create(createScanDto: CreateScanDto, trackingId: string): Promise<Scan> {
    try {
      this.logger.log(
        `Creando nuevo escaneo para idQr: ${createScanDto.idQr}`,
        ScanService.name,
        'create',
        trackingId
      );
      const scan = new this.scanModel(createScanDto);
      const savedScan = await scan.save();
      this.logger.log(
        `Escaneo creado exitosamente para idQr: ${savedScan.idQr}`,
        ScanService.name,
        'create',
        trackingId
      );
      return savedScan
    } catch (error) {
      this.logger.error(
        `Error al crear registro de escaneo: ${error.message}`,
        error.stack,
        ScanService.name,
        'create',
        trackingId
      );
      throw error;
    }
  }

  async getStatsByQrId(idQr: string, trackingId:string): Promise<any> {
    try {      
      this.logger.log(
        `Obteniendo estadÃ­sticas generales para idQr: ${idQr}`,
        ScanService.name,
        'getStatsByQrId',
        trackingId
      );

      const [totalScans, scansByDay, deviceStats, locationStats, originStats] = await Promise.all([
        this.scanModel.countDocuments({ idQr }),
        this.getDailyStats(idQr, 30, trackingId),
        this.getDeviceStats(idQr, trackingId),
        this.getLocationStats(idQr, trackingId),
        this.getOriginStats(idQr, trackingId)
      ]);

      return {
        totalScans,
        scansByDay,
        deviceStats,
        locationStats,
        originStats
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener estadÃ­sticas generales: ${error.message}`,
        error.stack,
        ScanService.name,
        'getStatsByQrId',
        trackingId
      );
      throw error;
    }
  }

  async getDailyStats(idQr: string, days: number = 30, trackingId:string): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      this.logger.log(
        `Obteniendo estadÃ­sticas diarias para idQr: ${idQr}, dÃ­as: ${days}`,
        ScanService.name,
        'getDailyStats',
        trackingId
      );

      return await this.scanModel.aggregate([
        { 
          $match: { 
            idQr,
            scanDate: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$scanDate' },
              month: { $month: '$scanDate' },
              day: { $dayOfMonth: '$scanDate' },
            },
            count: { $sum: 1 },
            successCount: {
              $sum: { $cond: ['$successful', 1, 0] }
            },
            errorCount: {
              $sum: { $cond: ['$successful', 0, 1] }
            }
          },
        },
        {
          $project: {
            _id: 0,
            date: {
              $dateFromParts: {
                year: '$_id.year',
                month: '$_id.month',
                day: '$_id.day',
              },
            },
            total: '$count',
            successful: '$successCount',
            errors: '$errorCount'
          },
        },
        { $sort: { date: 1 } },
      ]);
    } catch (error) {
      this.logger.error(
        `Error al obtener estadÃ­sticas diarias: ${error.message}`,
        error.stack,
        ScanService.name,
        'getDailyStats',
        trackingId
      );
      throw error;
    }
  }

  async getDeviceStats(idQr: string, trackingId:string): Promise<any> {
    try {
      this.logger.log(
        `Obteniendo estadÃ­sticas de dispositivos para idQr: ${idQr}`,
        ScanService.name,
        'getDeviceStats',
        trackingId
      );

      return await this.scanModel.aggregate([
        { $match: { idQr } },
        {
          $group: {
            _id: {
              platform: '$device.platform',
              browser: '$device.browser',
              isMobile: '$device.isMobile'
            },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            platform: '$_id.platform',
            browser: '$_id.browser',
            isMobile: '$_id.isMobile',
            count: '$count',
          },
        },
        { $sort: { count: -1 } },
      ]);
    } catch (error) {
      this.logger.error(
        `Error al obtener estadÃ­sticas de dispositivos: ${error.message}`,
        error.stack,
        ScanService.name,
        'getDeviceStats',
        trackingId
      );
      throw error;
    }
  }

  async getOriginStats(idQr: string, trackingId:string): Promise<any> {
    try {
      this.logger.log(
        `Obteniendo estadÃ­sticas de origen para idQr: ${idQr}`,
        ScanService.name,
        'getOriginStats',
        trackingId
      );

      return await this.scanModel.aggregate([
        { $match: { idQr } },
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
            count: '$count'
          }
        },
        { $sort: { count: -1 } }
      ]);
    } catch (error) {
      this.logger.error(
        `Error al obtener estadÃ­sticas de origen: ${error.message}`,
        error.stack,
        ScanService.name,
        'getOriginStats',
        trackingId
      );
      throw error;
    }
  }

  async getLocationStats(idQr: string, trackingId:string): Promise<any> {
    try {
      this.logger.log(
        `Obteniendo estadÃ­sticas de ubicaciones para idQr: ${idQr}`,
        ScanService.name,
        'getLocationStats',
        trackingId
      );

      return await this.scanModel.aggregate([
        { $match: { idQr } },
        {
          $group: {
            _id: {
              country: '$location.country',
              city: '$location.city'
            },
            count: { $sum: 1 },
            latitudes: { $push: '$location.latitude' },
            longitudes: { $push: '$location.longitude' }
          },
        },
        {
          $project: {
            _id: 0,
            country: '$_id.country',
            city: '$_id.city',
            count: '$count',
            centerPoint: {
              latitude: { $avg: '$latitudes' },
              longitude: { $avg: '$longitudes' }
            }
          },
        },
        { $sort: { count: -1 } },
      ]);
    } catch (error) {
      this.logger.error(
        `Error al obtener estadÃ­sticas de ubicaciones: ${error.message}`,
        error.stack,
        ScanService.name,
        'getLocationStats',
        trackingId
      );
      throw error;
    }
  }

  async getRecentScans(idQr: string, limit: number = 10,trackingId:string): Promise<Scan[]> {
    try {
      this.logger.log(
        `Obteniendo escaneos recientes para idQr: ${idQr}, lÃ­mite: ${limit}`,
        ScanService.name,
        'getRecentScans',
        trackingId
      );

      return await this.scanModel
        .find({ idQr })
        .sort({ scanDate: -1 })
        .limit(limit)
        .select('-__v')
        .exec();
    } catch (error) {
      this.logger.error(
        `Error al obtener escaneos recientes: ${error.message}`,
        error.stack,
        ScanService.name,
        'getRecentScans',
        trackingId
      );
      throw error;
    }
  }
} 