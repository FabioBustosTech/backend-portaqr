import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import type { QrFreeGeneration, PaginatedQrFreeGenerations } from '../../../domain/entities/qr-free-generation.entity';
import type {
  ICanCreateQrFreeGeneration,
  ICanGetAllQrFreeGeneration,
  ICanGetQrFreeGeneration,
} from '../../../domain/ports/queries/qr-free-generation.port';
import { QrFreeGenerationSchema, QrFreeGenerationDocument } from './schemas/qr-free-generation.schema';
import { QrFreeGenerationMongoMapper } from './mappers/qr-free-generation-mongo.mapper';

@Injectable()
export class MongoQrFreeGenerationRepository
  implements ICanCreateQrFreeGeneration, ICanGetAllQrFreeGeneration, ICanGetQrFreeGeneration
{
  private readonly logger = new Logger(MongoQrFreeGenerationRepository.name);

  constructor(
    @InjectModel(QrFreeGenerationSchema.name)
    private readonly qrFreeGenerationModel: Model<QrFreeGenerationDocument>,
    private readonly traceService: TraceService,
  ) {}

  async create(
    qrFreeGeneration: QrFreeGeneration,
    tracking: TrackingContext,
  ): Promise<QrFreeGeneration> {
    try {
      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'create:init', {
        email: qrFreeGeneration.email,
      });
      const newQr = new this.qrFreeGenerationModel(
        QrFreeGenerationMongoMapper.toSchemaData(qrFreeGeneration),
      );
      const savedQr = await newQr.save();
      return QrFreeGenerationMongoMapper.toEntity(savedQr);
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'create:error', error as Error);
      throw error;
    }
  }

  async getAll(
    page: number,
    limit: number,
    search: string,
    tracking: TrackingContext,
  ): Promise<PaginatedQrFreeGenerations> {
    try {
      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'getAll:init', {
        page,
        limit,
        search,
      });

      const skip = (page - 1) * limit;
      let query: any = {};

      if (search) {
        query = {
          $or: [
            { email: { $regex: search, $options: 'i' } },
            { 'information.data': { $regex: search, $options: 'i' } },
          ],
        };
      }

      const [items, total] = await Promise.all([
        this.qrFreeGenerationModel
          .find(query)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .exec(),
        this.qrFreeGenerationModel.countDocuments(query),
      ]);

      return {
        items: items.map((doc) => QrFreeGenerationMongoMapper.toEntity(doc)),
        total,
      };
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'getAll:error', error as Error);
      throw error;
    }
  }

  async getById(id: string, tracking: TrackingContext): Promise<QrFreeGeneration | null> {
    try {
      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'getById:init', { id });
      const qr = await this.qrFreeGenerationModel.findById(id).exec();
      if (!qr) {
        return null;
      }
      return QrFreeGenerationMongoMapper.toEntity(qr);
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'getById:error', error as Error);
      throw error;
    }
  }
}
