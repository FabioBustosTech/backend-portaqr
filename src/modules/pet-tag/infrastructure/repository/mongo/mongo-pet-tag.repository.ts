import { Injectable, Logger, NotFoundException, ConflictException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { customAlphabet } from 'nanoid';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import type { PetTag, PetData } from '../../../domain/entities/pet-tag.entity';
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
      const newTags = [];

      for (let i = 0; i < quantity; i++) {
        const idQr = uuidv4();
        const activationPin = nanoid();

        const tag = new this.petTagModel({
          idQr,
          activationPin,
          status: 'RESERVADO',
          commercialStatus: assignedStoreName ? 'ASIGNADO_COMERCIO' : 'EN_BODEGA',
          assignedStoreName: assignedStoreName || null,
        });

        await tag.save();
        newTags.push(tag);
      }

      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'generateBatch:complete', {
        total: newTags.length,
      });

      return newTags.map((tag) => ({
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
        mongoQuery.assignedStoreName = { $regex: query.storeName, $options: 'i' };
      }

      // Agregar búsqueda por texto si se especifica
      if (query.search) {
        const searchRegex = { $regex: query.search, $options: 'i' };
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

      const tag = await this.petTagModel.findOne({ idQr: petTagIdQr, userId: userObjectId });

      if (!tag) {
        throw new NotFoundException('Placa no encontrada o no pertenece a este usuario.');
      }

      tag.petData = (data.petData as any) ?? tag.petData;
      if (data.name !== undefined) tag.name = data.name;
      if (data.isFavorite !== undefined) tag.isFavorite = data.isFavorite;
      if (data.commercialStatus !== undefined) tag.commercialStatus = data.commercialStatus;
      await tag.save();

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

      const tag = await this.petTagModel
        .findOne({ idQr, activationPin })
        .lean();

      if (!tag) {
        throw new NotFoundException(`No se encontró una placa con ID QR: ${idQr}`);
      }

      if (tag.status !== 'RESERVADO') {
        throw new ConflictException(`La placa con ID QR: ${idQr} ya está activa`);
      }

      if (tag.activationPin !== activationPin) {
        throw new ConflictException(`PIN de activación incorrecto para la placa con ID QR: ${idQr}`);
      }

      const updatedTag = await this.petTagModel
        .findOneAndUpdate(
          { idQr },
          {
            status: 'ACTIVO',
            userId: new Types.ObjectId(userId),
            petData,
            expiration: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año desde ahora
            commercialStatus: 'VENDIDO',
          },
          { new: true },
        )
        .lean();

      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'activate:complete', { idQr });
      return updatedTag;
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'activate:error', error as Error);
      throw new HttpException(
        error.message || 'Error al activar placa',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
}
