import { Injectable, Logger, HttpStatus, HttpException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, PipelineStage, Types } from 'mongoose';
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
// SPEC-008 H3 (R2): input de b�squeda como literal, sin metacaracteres de regex (ReDoS)
import escapeStringRegexp = require('escape-string-regexp');

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

  /**
   * SPEC-015: listado global admin con $lookup del usuario dueño, filtros
   * (active/type/userId) y búsqueda ampliada (id QR, datos internos, tipo,
   * usuario dueño). Aggregate único con $facet → N+1=0 (patrón SPEC-007 H3).
   */
  async findAllWithSearch(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    active: string = 'all',
    type?: string,
    userId?: string,
    tracking?: TrackingContext,
  ): Promise<{ data: Qr[]; pagination: QrPagination }> {
    try {
      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'findAllWithSearch:init', {
        page,
        limit,
        search,
        active,
        type,
        userId,
      });

      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 10;
      const offset = (pageNum - 1) * limitNum;

      // ── 1. Filtros exactos (estado + tipo + usuario) combinados con $and ──
      // SPEC-015 ajuste: 'inactive' incluye TODOS los no activos (vencidos y
      // desactivados por admin) — el estado desactivado es trazabilidad, no un
      // estado distinto de negocio (deactivatedAt con $exists se mantiene como
      // filtro fino 'deactivated' para uso avanzado).
      const filters: FilterQuery<QrDocument> = {};
      if (active === 'active') {
        filters.active = true;
      } else if (active === 'inactive') {
        filters.active = false;
      } else if (active === 'deactivated') {
        filters.active = false;
        filters.deactivatedAt = { $exists: true };
      }
      if (type) filters.typeQr = type;
      if (userId) filters.userId = userId;

      const pipeline: PipelineStage[] = [];
      if (Object.keys(filters).length > 0) {
        pipeline.push({ $match: filters } as PipelineStage);
      }

      // ── 2. Lookup del usuario dueño (sin N+1) ──
      // qr.userId es STRING (qr.schema.ts L89) y users._id es ObjectId:
      // $convert con onError:null → QRs con userId no-ObjectId dan user: null
      // (no revientan el pipeline).
      pipeline.push({
        $addFields: {
          userIdObj: {
            $convert: { input: '$userId', to: 'objectId', onError: null },
          },
        },
      } as PipelineStage);
      pipeline.push({
        $lookup: {
          from: 'users',
          localField: 'userIdObj',
          foreignField: '_id',
          as: 'userInfo',
        },
      } as PipelineStage);
      pipeline.push({
        $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true },
      } as PipelineStage);

      // ── 3. Búsqueda libre (id QR, datos internos, tipo, usuario dueño) ──
      if (search && search.trim()) {
        pipeline.push({ $match: this.buildAdminSearchConditions(search) } as PipelineStage);
      }

      // ── 4. Paginar en origen con $facet (SPEC-007 H3) ──
      pipeline.push({
        $facet: {
          data: [
            { $sort: { updatedAt: -1 } },
            { $skip: offset },
            { $limit: limitNum },
          ],
          total: [{ $count: 'count' }],
        },
      } as PipelineStage);

      const result = await this.qrModel.aggregate<AdminQrAggregateDoc>(pipeline).exec();
      const facet = result?.[0] ?? { data: [], total: [] };
      const docs = facet.data ?? [];
      const total = facet.total?.[0]?.count ?? 0;
      const totalPages = Math.ceil(total / limitNum);

      return {
        data: docs.map((doc) => {
          const entity = QrMongoMapper.toEntity(doc as never);
          // SPEC-015: exponer solo campos seguros del dueño (admin-only)
          const owner = doc.userInfo?.[0];
          if (owner) {
            entity.user = {
              firstName: owner.firstName as string | undefined,
              paternalLastName: owner.paternalLastName as string | undefined,
              maternalLastName: owner.maternalLastName as string | undefined,
              userName: owner.userName as string | undefined,
              email: owner.email as string | undefined,
            };
          } else {
            entity.user = null;
          }
          return entity;
        }),
        pagination: {
          total,
          totalPages,
          currentPage: pageNum,
          limit: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
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

  /** SPEC-014: desactivación admin con trazabilidad (motivo obligatorio). */
  async deactivate(
    id: string,
    reason: string,
    actorId: string,
    tracking: TrackingContext,
  ): Promise<Qr | null> {
    try {
      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'deactivate:init', { id });

      const updatedDoc = await this.qrModel
        .findOneAndUpdate(
          { idQr: id },
          {
            $set: {
              active: false,
              expiration: null,
              deactivatedAt: new Date(),
              deactivatedBy: actorId,
              deactivationReason: reason,
            },
          },
          { new: true },
        )
        .exec();

      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'deactivate:complete', {
        id,
        updated: updatedDoc !== null,
      });

      return updatedDoc ? QrMongoMapper.toEntity(updatedDoc) : null;
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'deactivate:error', error as Error);
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
      // Normalizar page/limit a n�mero: el controller los pasa como strings
      // desde query params y $skip/$limit de aggregate exigen n�meros
      // (el find().limit() anterior toleraba strings � no-regresi�n SPEC-007 H3)
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 10;
      const skip = (pageNum - 1) * limitNum;
      const targetUserIdString = role === 'admin' && userId2 ? userId2 : userId;
      // SPEC-008 H5 (R5): ObjectId inválido → 400 en vez de 500 (CastError interna)
      if (!Types.ObjectId.isValid(targetUserIdString)) {
        this.traceService.warn(
          tracking,
          TraceLayer.REPOSITORY,
          'findUserByFavorites:invalid-object-id',
          { targetUserIdString },
        );
        throw new BadRequestException(
          `El ID de usuario no es válido: ${targetUserIdString}`,
        );
      }
      // IMPORTANTE (tipos de schema): qr guarda userId como STRING
      // (qr.schema.ts L89) y pet-tag como Types.ObjectId. El find() de Mongoose
      // casteaba el filtro al tipo del schema; el aggregate $match NO castea,
      // por lo que hay que usar el tipo correcto en cada colecci�n
      // (no-regresi�n: $match con ObjectId contra userId string devuelve 0).
      const targetUserId = new Types.ObjectId(targetUserIdString);
      const qrUserId = targetUserIdString;
      const petTagUserId = targetUserId;

      // --- 1. Lógica de Búsqueda Completa (Sin Omisiones) ---
      const qrQuery: FilterQuery<QrDocument> = { userId: qrUserId };
      const petTagQuery: FilterQuery<PetTagDocument> = { userId: petTagUserId };

      if (search) {
        // SPEC-008 H3 (R2): escapar como literal antes de $regex (anti-ReDoS)
        const safeSearch = escapeStringRegexp(search);
        // Condiciones de búsqueda específicas para el modelo Qr
        const typeConditions = {
          social: [{ typeQr: 'social' }, { $or: [{ 'data.username': { $regex: safeSearch, $options: 'i' } }, { 'data.platform': { $regex: safeSearch, $options: 'i' } }] }],
          email: [{ typeQr: 'email' }, { 'data.email': { $regex: safeSearch, $options: 'i' } }],
          whatsapp: [{ typeQr: 'whatsapp' }, { $or: [{ 'data.phone': { $regex: safeSearch, $options: 'i' } }, { 'data.message': { $regex: safeSearch, $options: 'i' } }] }],
          pet: [{ typeQr: 'pet' }, { $or: [{ 'data.petName': { $regex: safeSearch, $options: 'i' } }, { 'data.petBreed': { $regex: safeSearch, $options: 'i' } }, { 'data.petData.ownerPhone': { $regex: safeSearch, $options: 'i' } }] }],
          phone: [{ typeQr: 'phone' }, { 'data.phone': { $regex: safeSearch, $options: 'i' } }],
          map: [{ typeQr: 'map' }, { $or: [{ 'data.latitude': { $regex: safeSearch, $options: 'i' } }, { 'data.longitude': { $regex: safeSearch, $options: 'i' } }, { 'data.address': { $regex: safeSearch, $options: 'i' } }] }],
        };

        qrQuery['$or'] = [
          { idQr: { $regex: safeSearch, $options: 'i' } },
          { userId: { $regex: safeSearch, $options: 'i' } },
          { typeQr: { $regex: safeSearch, $options: 'i' } },
          { name: { $regex: safeSearch, $options: 'i' } },
          { 'data.urlList.url': { $regex: safeSearch, $options: 'i' } },
          { 'data.urlList.typeUrl': { $regex: safeSearch, $options: 'i' } },
          { 'data.vcard.fn': { $regex: safeSearch, $options: 'i' } },
          { 'data.vcard.org': { $regex: safeSearch, $options: 'i' } },
          { 'data.vcard.n.firstName': { $regex: safeSearch, $options: 'i' } },
          { 'data.vcard.n.lastName': { $regex: safeSearch, $options: 'i' } },
          { 'data.vcard.nickname': { $regex: safeSearch, $options: 'i' } },
          ...Object.values(typeConditions).flat(),
        ];

        // Condiciones de búsqueda específicas para el modelo PetTag
        petTagQuery['$or'] = [
          { qrId: { $regex: safeSearch, $options: 'i' } },
          { activationPin: { $regex: safeSearch, $options: 'i' } },
          { name: { $regex: safeSearch, $options: 'i' } },
          { 'petData.petName': { $regex: safeSearch, $options: 'i' } },
          { 'petData.ownerName': { $regex: safeSearch, $options: 'i' } },
        ];
      }

      // --- 2. Paginar en origen con $facet (SPEC-007 H3) ---
      // Cada colecci�n trae a lo sumo `limit` docs (2�limit en total a unir),
      // no la colecci�n completa; el total se calcula en la misma consulta.
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

      // Añadimos un campo 'resultType' para que el frontend pueda diferenciar, pero NO modificamos la estructura original
      const allItems = [
        ...qrData.map((item) => ({ ...item, resultType: 'qr' })),
        ...petTagData.map((item) => ({ ...item, resultType: 'pet-tag' })),
      ];

      // Ordenar el array combinado: primero favoritos, luego por fecha de actualización
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
      // SPEC-008 H5 (R5): errores de validación de cliente (ObjectId inválido)
      // se re-lanzan tal cual (400) — solo los errores internos se convierten en 500
      if (error instanceof BadRequestException) throw error;
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'findUserByFavorites:error', error as Error);
      throw new HttpException(
        'Ocurrió un error al procesar su solicitud.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ---- Helpers privados ----

  private buildSearchConditions(search: string): Record<string, unknown> {
    // SPEC-008 H3 (R2): input como literal antes de $regex (anti-ReDoS)
    const safeSearch = escapeStringRegexp(search);
    const typeConditions = {
      social: [
        { typeQr: 'social' },
        {
          $or: [
            { 'data.username': { $regex: safeSearch, $options: 'i' } },
            { 'data.platform': { $regex: safeSearch, $options: 'i' } },
          ],
        },
      ],
      email: [
        { typeQr: 'email' },
        { 'data.email': { $regex: safeSearch, $options: 'i' } },
      ],
      whatsapp: [
        { typeQr: 'whatsapp' },
        {
          $or: [
            { 'data.phone': { $regex: safeSearch, $options: 'i' } },
            { 'data.message': { $regex: safeSearch, $options: 'i' } },
          ],
        },
      ],
      pet: [
        { typeQr: 'pet' },
        {
          $or: [
            { 'data.petName': { $regex: safeSearch, $options: 'i' } },
            { 'data.petBreed': { $regex: safeSearch, $options: 'i' } },
            { 'data.petData.ownerPhone': { $regex: safeSearch, $options: 'i' } },
          ],
        },
      ],
      phone: [
        { typeQr: 'phone' },
        { 'data.phone': { $regex: safeSearch, $options: 'i' } },
      ],
      map: [
        { typeQr: 'map' },
        {
          $or: [
            { 'data.latitude': { $regex: safeSearch, $options: 'i' } },
            { 'data.longitude': { $regex: safeSearch, $options: 'i' } },
            { 'data.address': { $regex: safeSearch, $options: 'i' } },
          ],
        },
      ],
    };

    return {
      $or: [
        { idQr: { $regex: safeSearch, $options: 'i' } },
        { userId: { $regex: safeSearch, $options: 'i' } },
        { typeQr: { $regex: safeSearch, $options: 'i' } },
        // SPEC-015: datos internos del QR (búsqueda ampliada)
        { name: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } },
        { 'data.url': { $regex: safeSearch, $options: 'i' } },
        { 'data.text': { $regex: safeSearch, $options: 'i' } },
        { 'data.whatsappUrl': { $regex: safeSearch, $options: 'i' } },
        { 'data.emailUrl': { $regex: safeSearch, $options: 'i' } },
        { 'data.phoneUrl': { $regex: safeSearch, $options: 'i' } },
        { 'data.wifiData.ssid': { $regex: safeSearch, $options: 'i' } },
        { 'data.petData.petName': { $regex: safeSearch, $options: 'i' } },
        { 'data.petData.ownerName': { $regex: safeSearch, $options: 'i' } },
        { 'data.urlList.url': { $regex: safeSearch, $options: 'i' } },
        { 'data.urlList.typeUrl': { $regex: safeSearch, $options: 'i' } },
        { 'data.vcard.fn': { $regex: safeSearch, $options: 'i' } },
        { 'data.vcard.org': { $regex: safeSearch, $options: 'i' } },
        { 'data.vcard.n.firstName': { $regex: safeSearch, $options: 'i' } },
        { 'data.vcard.n.lastName': { $regex: safeSearch, $options: 'i' } },
        { 'data.vcard.nickname': { $regex: safeSearch, $options: 'i' } },
        ...Object.values(typeConditions).flat(),
      ],
    };
  }

  /**
   * SPEC-015: condiciones de búsqueda para la vista admin global.
   * = buildSearchConditions (campos QR + tipo) + campos del usuario dueño
   * (userInfo.* solo existe tras el $unwind del $lookup en el aggregate).
   */
  private buildAdminSearchConditions(search: string): Record<string, unknown> {
    const safeSearch = escapeStringRegexp(search);
    const base = this.buildSearchConditions(search);
    const baseOr = (base.$or ?? []) as unknown[];
    return {
      $or: [
        ...baseOr,
        { 'userInfo.firstName': { $regex: safeSearch, $options: 'i' } },
        { 'userInfo.paternalLastName': { $regex: safeSearch, $options: 'i' } },
        { 'userInfo.userName': { $regex: safeSearch, $options: 'i' } },
        { 'userInfo.email': { $regex: safeSearch, $options: 'i' } },
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

// SPEC-015: documento resultante del $facet del aggregate admin (QR + dueño).
// userInfo es el array del $lookup (0 o 1 elemento tras $unwind).
interface AdminQrAggregateDoc {
  data: Array<{
    [key: string]: unknown;
    userInfo?: Array<{
      firstName?: unknown;
      paternalLastName?: unknown;
      maternalLastName?: unknown;
      userName?: unknown;
      email?: unknown;
    }>;
  }>;
  total: Array<{ count: number }>;
}
