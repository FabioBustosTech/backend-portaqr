import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import type { Scan } from '../../../domain/entities/scan.entity';
import type { ICanCreateScan, ICanGetScan } from '../../../domain/ports/queries/scan.port';
import { ScanSchema, ScanDocument } from './schemas/scan.schema';
import { ScanMongoMapper } from './mappers/scan-mongo.mapper';

@Injectable()
export class MongoScanRepository implements ICanCreateScan, ICanGetScan {
  private readonly logger = new Logger(MongoScanRepository.name);

  constructor(
    @InjectModel(ScanSchema.name)
    private readonly scanModel: Model<ScanDocument>,
    private readonly traceService: TraceService,
  ) {}

  async create(scan: Scan, tracking: TrackingContext): Promise<Scan> {
    try {
      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'create:init', {
        idQr: scan.idQr,
      });
      const newScan = new this.scanModel(ScanMongoMapper.toSchemaData(scan));
      const savedScan = await newScan.save();
      return ScanMongoMapper.toEntity(savedScan);
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'create:error', error as Error);
      throw error;
    }
  }

  async getStatsByQrId(idQr: string, tracking: TrackingContext): Promise<unknown> {
    try {
      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'getStatsByQrId:init', { idQr });

      const [totalScans, scansByDay, deviceStats, locationStats, originStats] =
        await Promise.all([
          this.scanModel.countDocuments({ idQr }),
          this.getDailyStats(idQr, 30, tracking),
          this.getDeviceStats(idQr, tracking),
          this.getLocationStats(idQr, tracking),
          this.getOriginStats(idQr, tracking),
        ]);

      return {
        totalScans,
        scansByDay,
        deviceStats,
        locationStats,
        originStats,
      };
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'getStatsByQrId:error', error as Error);
      throw error;
    }
  }

  async getDailyStats(
    idQr: string,
    days: number = 30,
    tracking: TrackingContext,
  ): Promise<unknown> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'getDailyStats:init', {
        idQr,
        days,
      });

      return await this.scanModel.aggregate([
        {
          $match: {
            idQr,
            scanDate: { $gte: startDate },
          },
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
              $sum: { $cond: ['$successful', 1, 0] },
            },
            errorCount: {
              $sum: { $cond: ['$successful', 0, 1] },
            },
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
            errors: '$errorCount',
          },
        },
        { $sort: { date: 1 } },
      ]);
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'getDailyStats:error', error as Error);
      throw error;
    }
  }

  async getDeviceStats(idQr: string, tracking: TrackingContext): Promise<unknown> {
    try {
      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'getDeviceStats:init', { idQr });

      return await this.scanModel.aggregate([
        { $match: { idQr } },
        {
          $group: {
            _id: {
              platform: '$device.platform',
              browser: '$device.browser',
              isMobile: '$device.isMobile',
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
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'getDeviceStats:error', error as Error);
      throw error;
    }
  }

  async getOriginStats(idQr: string, tracking: TrackingContext): Promise<unknown> {
    try {
      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'getOriginStats:init', { idQr });

      return await this.scanModel.aggregate([
        { $match: { idQr } },
        {
          $group: {
            _id: '$origen',
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            origen: '$_id',
            count: '$count',
          },
        },
        { $sort: { count: -1 } },
      ]);
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'getOriginStats:error', error as Error);
      throw error;
    }
  }

  async getLocationStats(idQr: string, tracking: TrackingContext): Promise<unknown> {
    try {
      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'getLocationStats:init', { idQr });

      return await this.scanModel.aggregate([
        { $match: { idQr } },
        {
          $group: {
            _id: {
              country: '$location.country',
              city: '$location.city',
            },
            count: { $sum: 1 },
            latitudes: { $push: '$location.latitude' },
            longitudes: { $push: '$location.longitude' },
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
              longitude: { $avg: '$longitudes' },
            },
          },
        },
        { $sort: { count: -1 } },
      ]);
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'getLocationStats:error', error as Error);
      throw error;
    }
  }

  async getRecentScans(
    idQr: string,
    limit: number = 10,
    tracking: TrackingContext,
  ): Promise<Scan[]> {
    try {
      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'getRecentScans:init', {
        idQr,
        limit,
      });

      const docs = await this.scanModel
        .find({ idQr })
        .sort({ scanDate: -1 })
        .limit(limit)
        .select('-__v')
        .exec();

      return docs.map((doc) => ScanMongoMapper.toEntity(doc));
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'getRecentScans:error', error as Error);
      throw error;
    }
  }
}
