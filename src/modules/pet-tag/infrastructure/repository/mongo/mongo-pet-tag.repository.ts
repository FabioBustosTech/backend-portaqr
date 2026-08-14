import { Injectable, Logger, NotFoundException, ConflictException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { customAlphabet } from 'nanoid';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import type { PetData } from '../../../domain/entities/pet-tag.entity';
import type {
  ICanGeneratePetTag,
  ICanGetPetTag,
  ICanUpdatePetTag,
  GeneratedPetTagResult,
  ReservedTagsQuery,
  ReservedTagsResult,
} from '../../../domain/ports/queries/pet-tag.port';
import { PetTagSchema, PetTagDocument } from './schemas/pet-tag.schema';
import { PetTagMongoMapper } from './mappers/pet-tag-mongo.mapper';
// SPEC-008 H3 (R2): input de búsqueda como literal, sin metacaracteres de regex (ReDoS)
import escapeStringRegexp = require('escape-string-regexp');

@Injectable()
export class MongoPetTagRepository
  implements ICanGeneratePetTag, ICanGetPetTag, ICanUpdatePetTag
{
  private readonly logger = new Logger(MongoPetTagRepository.name);

  constructor(
    @InjectModel(PetTagSchema.name)
    private readonly petTagModel: Model<PetTagDocument>,
    private readonly traceService: TraceService,
  ) {}

  async generateBatch(
    quantity: number,
    assignedStoreName: string = '',
    tracking: TrackingContext,
  ): Promise<GeneratedPetTagResult[]> {
    try {
      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'generateBatch:init', {
        quantity,
        assignedStoreName,
      });

      const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);

      // Construir los documentos y persistir en 1 sola operación batch (SPEC-007 H1)
      const docs = Array.from({ length: quantity }, () => ({
        idQr: uuidv4(),
        activationPin: nanoid(),
        status: 'RESERVADO',
        commercialStatus: assignedStoreName ? 'ASIGNADO_COMERCIO' : 'EN_BODEGA',
        assignedStoreName: assignedStoreName || null,
      }));

      const saved = await this.petTagModel.insertMany(docs);

      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'generateBatch:complete', {
        total: saved.length,
      });

      return saved.map((tag) => ({
        qrId: tag.idQr,
        activationPin: tag.activationPin,
        assignedStoreName: tag.assignedStoreName,
      }));
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'generateBatch:error', error as Error);
      throw new HttpException(
        error.message || 'Error al generar lote de placas de mascota',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findReserved(
    query: ReservedTagsQuery,
    tracking: TrackingContext,
  ): Promise<ReservedTagsResult> {
    try {
      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'findReserved:init', { query });

      const page = query.page || 1;
      const limit = query.limit || 100;
      const skip = (page - 1) * limit;

      // Construir el filtro base
      const mongoQuery: FilterQuery<PetTagDocument> = {};

      // Agregar filtro de estado si se especifica
      if (query.status) {
        mongoQuery.status = query.status;
      }
      if (query.commercialStatus) {
        mongoQuery.commercialStatus = query.commercialStatus;
      }
      if (query.storeName) {
        // SPEC-008 H3 (R2): input como literal antes de $regex (anti-ReDoS)
        mongoQuery.assignedStoreName = {
          $regex: escapeStringRegexp(query.storeName),
          $options: 'i',
        };
      }

      // Agregar búsqueda por texto si se especifica
      if (query.search) {
        // SPEC-008 H3 (R2): input como literal antes de $regex (anti-ReDoS)
        const searchRegex = { $regex: escapeStringRegexp(query.search), $options: 'i' };
        mongoQuery.$or = [
          { idQr: searchRegex },
          { activationPin: searchRegex },
          { 'petData.petName': searchRegex },
          { 'petData.ownerName': searchRegex },
        ];
      }

      // Agregar filtros de fecha si se especifican
      if (query.startDate) {
        mongoQuery.createdAt = { $gte: new Date(query.startDate) };
      }
      if (query.endDate) {
        if (!mongoQuery.createdAt) {
          mongoQuery.createdAt = {};
        }
        (mongoQuery.createdAt as any).$lte = new Date(query.endDate);
      }

      const [results, total] = await Promise.all([
        this.petTagModel
          .find(mongoQuery)
          .select('_id idQr activationPin createdAt status commercialStatus assignedStoreName')
          .sort({ createdAt: -1 }) // Las más nuevas primero
          .skip(skip)
          .limit(limit)
          .lean(),
        this.petTagModel.countDocuments(mongoQuery),
      ]);

      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'findReserved:complete', {
        total: results.length,
      });

      return {
        // Mapear a entidad: convierte _id (ObjectId) a id string y evita
        // serializaciones raras del ObjectId ({buffer}) que rompen keys de React
        data: results.map((doc) => PetTagMongoMapper.toEntity(doc)),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'findReserved:error', error as Error);
      throw new HttpException(
        error.message || 'Error al consultar placas reservadas',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getStatus(
    idQr: string,
    tracking: TrackingContext,
  ): Promise<{ status?: string; petData?: PetData } | null> {
    try {
      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'getStatus:init', { idQr });

      const tag = await this.petTagModel.findOne({ idQr }).select('status petData').lean();
      if (!tag) {
        return null;
      }

      return tag as unknown as { status?: string; petData?: PetData };
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'getStatus:error', error as Error);
      throw new HttpException(
        error.message || 'Error al consultar estado de placa',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  async update(
    petTagIdQr: string,
    userId: string,
    data: { petData?: PetData; name?: string; isFavorite?: boolean; commercialStatus?: string },
    tracking: TrackingContext,
  ): Promise<unknown> {
    try {
      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'update:init', {
        petTagIdQr,
        userId,
      });
      const userObjectId = new Types.ObjectId(userId);

      // 1 round-trip (SPEC-007 H6): findOneAndUpdate en vez de find + mutate + save
      const tag = await this.petTagModel
        .findOneAndUpdate(
          { idQr: petTagIdQr, userId: userObjectId },
          {
            $set: {
              petData: (data.petData as any) ?? undefined,
              ...(data.name !== undefined && { name: data.name }),
              ...(data.isFavorite !== undefined && { isFavorite: data.isFavorite }),
              ...(data.commercialStatus !== undefined && {
                commercialStatus: data.commercialStatus,
              }),
            },
          },
          { new: true, runValidators: true }, // runValidators: no-regresión de enum commercialStatus
        )
        .lean();

      if (!tag) {
        throw new NotFoundException('Placa no encontrada o no pertenece a este usuario.');
      }

      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'update:complete', { petTagIdQr });
      return tag;
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'update:error', error as Error);
      throw new HttpException(
        error.message || 'Error al actualizar datos de placa',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * SPEC-016 RF-3: persiste SOLO el sub-campo petData.petImageUrl (1 round-trip).
   * No pisa el resto del petData (a diferencia de update() que reemplaza el objeto completo).
   */
  async setPetImageUrl(
    idQr: string,
    userId: string,
    url: string | null,
    tracking: TrackingContext,
  ): Promise<unknown> {
    try {
      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'setPetImageUrl:init', {
        idQr,
        userId,
        url: url ? `${url.slice(0, 60)}…` : null, // no loguear URLs completas innecesariamente
      });

      const userObjectId = new Types.ObjectId(userId);

      const tag = await this.petTagModel
        .findOneAndUpdate(
          { idQr, userId: userObjectId },
          { $set: { 'petData.petImageUrl': url } },
          { new: true, runValidators: true },
        )
        .lean();

      if (!tag) {
        throw new NotFoundException('Placa no encontrada o no pertenece a este usuario.');
      }

      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'setPetImageUrl:complete', {
        idQr,
        hasImage: url !== null,
      });
      return tag;
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'setPetImageUrl:error', error as Error);
      throw new HttpException(
        error.message || 'Error al actualizar la foto de la placa',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  async activate(
    idQr: string,
    activationPin: string,
    petData: PetData,
    userId: string,
    tracking: TrackingContext,
  ): Promise<unknown> {
    try {
      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'activate:init', {
        idQr,
        userId,
      });

      // SPEC-009 A12: la placa está bloqueada temporalmente (5 PINs fallidos)
      const locked = await this.petTagModel
        .findOne({ idQr, activationLockedUntil: { $gt: new Date() } })
        .select('_id')
        .lean()
        .exec();
      if (locked) {
        throw new HttpException(
          'Demasiados intentos de activación. Intenta nuevamente en unos minutos.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // 1 round-trip atómico (SPEC-007 H5): el filtro condicional elimina el TOCTOU.
      // Al éxito se resetea el contador de intentos (SPEC-009 A12).
      const updatedTag = await this.petTagModel
        .findOneAndUpdate(
          { idQr, activationPin, status: 'RESERVADO' },
          {
            $set: {
              status: 'ACTIVO',
              userId: new Types.ObjectId(userId),
              petData,
              expiration: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año desde ahora
              commercialStatus: 'VENDIDO',
              activationAttempts: 0,
              activationLockedUntil: null,
            },
          },
          { new: true, runValidators: true }, // runValidators: no-regresión de enums status/commercialStatus
        )
        .lean();

      if (updatedTag) {
        this.traceService.log(tracking, TraceLayer.REPOSITORY, 'activate:complete', { idQr });
        return updatedTag;
      }

      // Rama de error: distinguir placa inexistente vs PIN incorrecto
      const existing = await this.petTagModel
        .findOne({ idQr })
        .select('activationPin status activationAttempts activationLockedUntil')
        .lean()
        .exec();

      if (!existing) {
        throw new NotFoundException(`No se encontró una placa con ID QR: ${idQr}`);
      }

      if (existing.status !== 'RESERVADO') {
        // Existe pero no está RESERVADO (o lo activó otra request concurrente)
        throw new ConflictException(`La placa con ID QR: ${idQr} ya está activa`);
      }

      // SPEC-009 A12: PIN incorrecto → incrementar contador; al llegar a 5 → bloquear 30 min
      const maxAttempts = parseInt(process.env.PET_TAG_MAX_ATTEMPTS ?? '5', 10) || 5;
      const lockMinutes = parseInt(process.env.PET_TAG_LOCK_MINUTES ?? '30', 10) || 30;
      const attempts = (existing.activationAttempts ?? 0) + 1;
      await this.petTagModel
        .updateOne({ idQr }, { $set: { activationAttempts: attempts } })
        .exec();
      if (attempts >= maxAttempts) {
        await this.petTagModel
          .updateOne(
            { idQr },
            {
              $set: {
                activationLockedUntil: new Date(Date.now() + lockMinutes * 60 * 1000),
                activationAttempts: 0,
              },
            },
          )
          .exec();
        this.traceService.warn(tracking, TraceLayer.REPOSITORY, 'activate:locked', { idQr });
        throw new HttpException(
          'Demasiados intentos de activación. Intenta nuevamente en unos minutos.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new HttpException('PIN de activación incorrecto', HttpStatus.BAD_REQUEST);
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'activate:error', error as Error);
      throw error;
    }
  }
}
