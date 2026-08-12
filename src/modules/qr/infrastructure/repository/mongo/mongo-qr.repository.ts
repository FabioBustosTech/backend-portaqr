import { Injectable, Logger, HttpStatus, HttpException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import type { Qr } from '../../../domain/entities/qr.entity';
import type {
  ICanGetAllQr,
  ICanGetQr,
  ICanCreateQr,
  ICanUpdateQr,
  ICanDeleteQr,
  QrPagination,
} from '../../../domain/ports/queries/qr.port';
import { QrSchema, QrDocument } from './schemas/qr.schema';
import { QrMongoMapper } from './mappers/qr-mongo.mapper';
import { PetTagSchema, PetTagDocument } from 'src/modules/pet-tag/infrastructure/repository/mongo/schemas/pet-tag.schema';

@Injectable()
export class MongoQrRepository
  implements ICanGetAllQr, ICanGetQr, ICanCreateQr, ICanUpdateQr, ICanDeleteQr
{
  private readonly logger = new Logger(MongoQrRepository.name);

  constructor(
    @InjectModel(QrSchema.name)
    private readonly qrModel: Model<QrDocument>,
    @InjectModel(PetTagSchema.name)
    private readonly petTagModel: Model<PetTagDocument>,
    private readonly traceService: TraceService,
  ) {}

  async create(qr: Qr, tracking: TrackingContext): Promise<Qr> {
    try {
      const createdQr = new this.qrModel(QrMongoMapper.toSchemaData(qr));
      const saved = await createdQr.save();
      return QrMongoMapper.toEntity(saved);
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'create:error', error as Error);
      throw error;
    }
  }

  async getRecentActive(limit: number, tracking: TrackingContext): Promise<Qr[]> {
    try {
      const docs = await this.qrModel
        .find({ active: true })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean()
        .exec();
      return docs.map((doc) => QrMongoMapper.toEntity(doc));
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'getRecentActive:error', error as Error);
      throw error;
    }
  }

  async getAll(tracking: TrackingContext): Promise<Qr[]> {
    try {
      const docs = await this.qrModel.find().lean().exec();
      return docs.map((doc) => QrMongoMapper.toEntity(doc));
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'getAll:error', error as Error);
      throw error;
    }
  }

  async findAllWithSearch(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    tracking: TrackingContext,
  ): Promise<{ data: Qr[]; pagination: QrPagination }> {
    try {
      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'findAllWithSearch:init', {
        page,
        limit,
        search,
      });

      const query = this.buildSearchQuery(search);

      const offset = (page - 1) * limit;
      const [data, total] = await Promise.all([
        this.qrModel.find(query).skip(offset).limit(limit).lean().exec(),
        this.qrModel.countDocuments(query).exec(),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: data.map((doc) => QrMongoMapper.toEntity(doc)),
        pagination: {
          total,
          totalPages,
          currentPage: page,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'findAllWithSearch:error', error as Error);
      throw error;
    }
  }

  async getById(id: string, tracking: TrackingContext): Promise<Qr | null> {
    try {
      const qr = await this.qrModel.findOne({ idQr: id }).lean().exec();
      return qr ? QrMongoMapper.toEntity(qr) : null;
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'getById:error', error as Error);
      throw error;
    }
  }

  async findByUserId(userId: string, tracking: TrackingContext): Promise<Qr[]> {
    try {
      const docs = await this.qrModel.find({ userId }).lean().exec();
      return docs.map((doc) => QrMongoMapper.toEntity(doc));
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'findByUserId:error', error as Error);
      throw error;
    }
  }

  async update(
    id: string,
    data: Partial<Qr>,
    tracking: TrackingContext,
  ): Promise<Qr | null> {
    try {
      const updatedQr = await this.qrModel
        .findOneAndUpdate({ idQr: id }, QrMongoMapper.toSchemaData(data), { new: true })
        .exec();
      return updatedQr ? QrMongoMapper.toEntity(updatedQr) : null;
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'update:error', error as Error);
      throw error;
    }
  }

  async activateMany(
    qrCodes: string[],
    expiration: Date,
    tracking: TrackingContext,
  ): Promise<{ matchedCount: number; modifiedCount: number }> {
    try {
      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'activateMany:init', {
        total: qrCodes.length,
      });

      const result = await this.qrModel
        .updateMany(
          { idQr: { $in: qrCodes } },
          { $set: { active: true, expiration } },
        )
        .exec();

      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'activateMany:complete', {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      });

      return {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      };
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'activateMany:error', error as Error);
      throw error;
    }
  }

  async delete(id: string, tracking: TrackingContext): Promise<boolean> {
    try {
      const result = await this.qrModel.findOneAndDelete({ idQr: id }).exec();
      return result !== null;
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'delete:error', error as Error);
      throw error;
    }
  }

  async findPaginatedByUser(
    userId: string,
    page: number = 1,
    limit: number = 10,
    search: string = '',
    tracking: TrackingContext,
  ): Promise<{ data: Qr[]; pagination: QrPagination }> {
    try {
      let query: Record<string, unknown> = { userId };

      if (search) {
        const conditions = this.buildSearchConditions(search);
        query = { ...query, ...conditions };
      }

      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        this.qrModel
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.qrModel.countDocuments(query),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: data.map((doc) => QrMongoMapper.toEntity(doc)),
        pagination: {
          total,
          totalPages,
          currentPage: page,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'findPaginatedByUser:error', error as Error);
      throw error;
    }
  }

  async findUserByFavorites(
    userId: string,
    page: number = 1,
    limit: number = 10,
    search: string = '',
    role: string = '',
    userId2: string = '',
    tracking: TrackingContext,
  ): Promise<{ data: unknown[]; pagination: QrPagination }> {
    try {
      // Normalizar page/limit a número: el controller los pasa como strings
      // desde query params y $skip/$limit de aggregate exigen números
      // (el find().limit() anterior toleraba strings — no-regresión SPEC-007 H3)
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 10;
      const skip = (pageNum - 1) * limitNum;
      const targetUserIdString = role === 'admin' && userId2 ? userId2 : userId;
      const targetUserId = new Types.ObjectId(targetUserIdString);

      // --- 1. LÃ³gica de BÃºsqueda Completa (Sin Omisiones) ---
      const qrQuery: FilterQuery<QrDocument> = { userId: targetUserId };
      const petTagQuery: FilterQuery<PetTagDocument> = { userId: targetUserId };

      if (search) {
        // Condiciones de bÃºsqueda especÃ­ficas para el modelo Qr
        const typeConditions = {
          social: [{ typeQr: 'social' }, { $or: [{ 'data.username': { $regex: search, $options: 'i' } }, { 'data.platform': { $regex: search, $options: 'i' } }] }],
          email: [{ typeQr: 'email' }, { 'data.email': { $regex: search, $options: 'i' } }],
          whatsapp: [{ typeQr: 'whatsapp' }, { $or: [{ 'data.phone': { $regex: search, $options: 'i' } }, { 'data.message': { $regex: search, $options: 'i' } }] }],
          pet: [{ typeQr: 'pet' }, { $or: [{ 'data.petName': { $regex: search, $options: 'i' } }, { 'data.petBreed': { $regex: search, $options: 'i' } }, { 'data.petData.ownerPhone': { $regex: search, $options: 'i' } }] }],
          phone: [{ typeQr: 'phone' }, { 'data.phone': { $regex: search, $options: 'i' } }],
          map: [{ typeQr: 'map' }, { $or: [{ 'data.latitude': { $regex: search, $options: 'i' } }, { 'data.longitude': { $regex: search, $options: 'i' } }, { 'data.address': { $regex: search, $options: 'i' } }] }],
        };

        qrQuery['$or'] = [
          { idQr: { $regex: search, $options: 'i' } },
          { userId: { $regex: search, $options: 'i' } },
          { typeQr: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } },
          { 'data.urlList.url': { $regex: search, $options: 'i' } },
          { 'data.urlList.typeUrl': { $regex: search, $options: 'i' } },
          { 'data.vcard.fn': { $regex: search, $options: 'i' } },
          { 'data.vcard.org': { $regex: search, $options: 'i' } },
          { 'data.vcard.n.firstName': { $regex: search, $options: 'i' } },
          { 'data.vcard.n.lastName': { $regex: search, $options: 'i' } },
          { 'data.vcard.nickname': { $regex: search, $options: 'i' } },
          ...Object.values(typeConditions).flat(),
        ];

        // Condiciones de bÃºsqueda especÃ­ficas para el modelo PetTag
        petTagQuery['$or'] = [
          { qrId: { $regex: search, $options: 'i' } },
          { activationPin: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } },
          { 'petData.petName': { $regex: search, $options: 'i' } },
          { 'petData.ownerName': { $regex: search, $options: 'i' } },
        ];
      }

      // --- 2. Paginar en origen con $facet (SPEC-007 H3) ---
      // Cada colección trae a lo sumo `limit` docs (2×limit en total a unir),
      // no la colección completa; el total se calcula en la misma consulta.
      const sort = { isFavorite: -1, updatedAt: -1 } as const;
      const [qrFacet, petTagFacet] = await Promise.all([
        this.qrModel
          .aggregate([
            { $match: qrQuery },
            { $sort: sort },
            {
              $facet: {
                data: [{ $skip: skip }, { $limit: limitNum }],
                total: [{ $count: 'v' }],
              },
            },
          ])
          .exec(),
        this.petTagModel
          .aggregate([
            { $match: petTagQuery },
            { $sort: sort },
            {
              $facet: {
                data: [{ $skip: skip }, { $limit: limitNum }],
                total: [{ $count: 'v' }],
              },
            },
          ])
          .exec(),
      ]);

      const qrData = qrFacet[0]?.data ?? [];
      const petTagData = petTagFacet[0]?.data ?? [];
      const totalQrs = qrFacet[0]?.total?.[0]?.v ?? 0;
      const totalPetTags = petTagFacet[0]?.total?.[0]?.v ?? 0;

      // --- 3. Unificar, Ordenar y Paginar (Sin Mapeo Inverso) ---

      // AÃ±adimos un campo 'resultType' para que el frontend pueda diferenciar, pero NO modificamos la estructura original
      const allItems = [
        ...qrData.map((item) => ({ ...item, resultType: 'qr' })),
        ...petTagData.map((item) => ({ ...item, resultType: 'pet-tag' })),
      ];

      // Ordenar el array combinado: primero favoritos, luego por fecha de actualizaciÃ³n
      allItems.sort((a, b) => {
        const aIsFavorite = a.isFavorite ?? false;
        const bIsFavorite = b.isFavorite ?? false;

        if (aIsFavorite !== bIsFavorite) {
          return aIsFavorite ? -1 : 1;
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

      const total = totalQrs + totalPetTags;
      const totalPages = Math.ceil(total / limit);

      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'findUserByFavorites:complete', {
        total,
        totalPages,
        results: allItems.length,
      });

      return {
        data: allItems,
        pagination: {
          total,
          totalPages,
          currentPage: pageNum.toString(),
          limit: limitNum.toString(),
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      };
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'findUserByFavorites:error', error as Error);
      throw new HttpException(
        'OcurriÃ³ un error al procesar su solicitud.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ---- Helpers privados ----

  private buildSearchConditions(search: string): Record<string, unknown> {
    const typeConditions = {
      social: [
        { typeQr: 'social' },
        {
          $or: [
            { 'data.username': { $regex: search, $options: 'i' } },
            { 'data.platform': { $regex: search, $options: 'i' } },
          ],
        },
      ],
      email: [
        { typeQr: 'email' },
        { 'data.email': { $regex: search, $options: 'i' } },
      ],
      whatsapp: [
        { typeQr: 'whatsapp' },
        {
          $or: [
            { 'data.phone': { $regex: search, $options: 'i' } },
            { 'data.message': { $regex: search, $options: 'i' } },
          ],
        },
      ],
      pet: [
        { typeQr: 'pet' },
        {
          $or: [
            { 'data.petName': { $regex: search, $options: 'i' } },
            { 'data.petBreed': { $regex: search, $options: 'i' } },
            { 'data.petData.ownerPhone': { $regex: search, $options: 'i' } },
          ],
        },
      ],
      phone: [
        { typeQr: 'phone' },
        { 'data.phone': { $regex: search, $options: 'i' } },
      ],
      map: [
        { typeQr: 'map' },
        {
          $or: [
            { 'data.latitude': { $regex: search, $options: 'i' } },
            { 'data.longitude': { $regex: search, $options: 'i' } },
            { 'data.address': { $regex: search, $options: 'i' } },
          ],
        },
      ],
    };

    return {
      $or: [
        { idQr: { $regex: search, $options: 'i' } },
        { userId: { $regex: search, $options: 'i' } },
        { typeQr: { $regex: search, $options: 'i' } },
        { 'data.urlList.url': { $regex: search, $options: 'i' } },
        { 'data.urlList.typeUrl': { $regex: search, $options: 'i' } },
        { 'data.vcard.fn': { $regex: search, $options: 'i' } },
        { 'data.vcard.org': { $regex: search, $options: 'i' } },
        { 'data.vcard.n.firstName': { $regex: search, $options: 'i' } },
        { 'data.vcard.n.lastName': { $regex: search, $options: 'i' } },
        { 'data.vcard.nickname': { $regex: search, $options: 'i' } },
        ...Object.values(typeConditions).flat(),
      ],
    };
  }

  private buildSearchQuery(search: string): Record<string, unknown> {
    let query: Record<string, unknown> = {};

    if (search) {
      query = this.buildSearchConditions(search);
    }

    return query;
  }
}
