import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TraceService, TraceLayer } from '../../../../../common/services/trace.service';
import type { QrActivate } from '../../../domain/entities/qr-activate.entity';
import type { ICanCreateQrActivate, ICanGetQrActivate, ICanUpdateQrActivate, ICanDeleteQrActivate } from '../../../domain/ports/queries/qr-activate.port';
import { QrActivateSchema, QrActivateDocument } from './schemas/qr-activate.schema';
import { QrActivateMongoMapper } from './mappers/qr-activate-mongo.mapper';
import type { PaginatedResult } from '../../../../../common/dto/pagination.dto';
import type { TrackingContext } from '../../../../../common/decorators/tracking.decorator';
// SPEC-008 H3 (R2): input de b�squeda como literal, sin metacaracteres de regex (ReDoS)
import escapeStringRegexp = require('escape-string-regexp');

@Injectable()
export class MongoQrActivateRepository
  implements
    ICanCreateQrActivate,
    ICanGetQrActivate,
    ICanUpdateQrActivate,
    ICanDeleteQrActivate
{
  private readonly logger = new Logger(MongoQrActivateRepository.name);

  constructor(
    @InjectModel(QrActivateSchema.name)
    private readonly model: Model<QrActivateDocument>,
    private readonly traceService: TraceService,
  ) {}

  async create(activation: QrActivate, tracking: TrackingContext): Promise<QrActivate> {
    try {
      const nuevo = new this.model(QrActivateMongoMapper.toSchemaData(activation));
      const saved = await nuevo.save();
      return QrActivateMongoMapper.toEntity(saved);
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'create:error', error as Error);
      throw error;
    }
  }

  async getAll(
    page: number,
    limit: number,
    search: string | undefined,
    methodActivation: string | undefined,
    userId: string | undefined,
    tracking: TrackingContext,
  ): Promise<PaginatedResult<QrActivate>> {
    try {
      const query: Record<string, unknown> = {};
      // SPEC-009 A3: filtro de ownership — un usuario solo ve sus activaciones (salvo admin)
      if (userId) {
        query.userId = userId;
      }
      const isBooleanString = (str: string) =>
        str.toLowerCase() === 'true' || str.toLowerCase() === 'false';
      const searchBoolean = search ? (isBooleanString(search) ? search.toLowerCase() === 'true' : null) : null;

      if (searchBoolean !== null) {
        query.sendDocument = searchBoolean;
      } else if (search) {
        // SPEC-008 H3 (R2): input como literal antes de $regex (anti-ReDoS)
        const safeSearch = escapeStringRegexp(search);
        query.$or = [
          { descriptionAdministrator: { $regex: safeSearch, $options: 'i' } },
          { 'WebpayTransaction.id': { $regex: safeSearch, $options: 'i' } },
        ];
      }

      if (methodActivation) {
        query.methodActivation = methodActivation;
      }

      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        this.model
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('userId', '_id email name')
          // NOTA: qrList.qrCode guarda el UUID idQr (string), no el _id ObjectId.
          // Hacer populate con ref 'QR' lanza CastError (fix 2026-08-07).
          // El frontend usa qr.qrCode directo; no requiere populate.
          .populate('qrList.plan', 'name description')
          .populate('adminId', '_id name')
          .lean()
          .exec(),
        this.model.countDocuments(query),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: data.map((doc) => QrActivateMongoMapper.toEntity(doc)),
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      };
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'getAll:error', error as Error);
      throw error;
    }
  }

  async getById(id: string, tracking: TrackingContext): Promise<QrActivate | null> {
    try {
      const doc = await this.model
        .findById(id)
        .populate('userId', '_id email name')
        // NOTA: qrList.qrCode es UUID string (idQr), no ObjectId � no populable (fix 2026-08-07)
        .populate('qrList.plan', 'name description')
        .populate('adminId', '_id name')
        .lean()
        .exec();
      return doc ? QrActivateMongoMapper.toEntity(doc) : null;
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'getById:error', error as Error);
      throw error;
    }
  }

  async getByWebpayToken(token: string, tracking: TrackingContext): Promise<QrActivate | null> {
    try {
      const doc = await this.model.findOne({ 'WebpayTransaction.id': token }).lean().exec();
      return doc ? QrActivateMongoMapper.toEntity(doc) : null;
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'getByWebpayToken:error', error as Error);
      throw error;
    }
  }

  async update(
    id: string,
    data: Partial<QrActivate>,
    tracking: TrackingContext,
  ): Promise<QrActivate | null> {
    try {
      const updated = await this.model
        .findByIdAndUpdate(
          id,
          { $set: QrActivateMongoMapper.toSchemaData(data) },
          { new: true },
        )
        .exec();
      return updated ? QrActivateMongoMapper.toEntity(updated) : null;
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'update:error', error as Error);
      throw error;
    }
  }

  async delete(id: string, tracking: TrackingContext): Promise<boolean> {
    try {
      const result = await this.model.findByIdAndDelete(id).exec();
      return result !== null;
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'delete:error', error as Error);
      throw error;
    }
  }
}
