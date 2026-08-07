// pet-tag.service.ts
import { Injectable, NotFoundException, ConflictException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { customAlphabet } from 'nanoid';
import { ActivatePetTagDto } from './dto/activate-pet-tag.dto';
import { UpdatePetTagDto } from './dto/update-pet-tag.dto';
import { PetTag, PetDataEntity } from './entities/pet-tag.entity';
import { QueryReservedTagsDto } from './dto/query-reserved-tags.dto';
import { CustomLogger } from 'src/shared/utils/logger.util';
import { CommercialStatus } from './enums/commercial-status.enum';

@Injectable()
export class PetTagService {
  private readonly trackingId = 'pet-tag-service';

  constructor(
    @InjectModel(PetTag.name) private petTagModel: Model<PetTag>,
    private readonly logger: CustomLogger
  ) {
    this.logger = logger;
  }

  async generateBatch(quantity: number, assignedStoreName: string = '') {
    try {
      this.logger.log(
        `Generando ${quantity} placas de mascota en lote`,
        PetTagService.name,
        'generateBatch',
        this.trackingId
      );

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

      this.logger.log(
        `GeneraciÃ³n exitosa de ${newTags.length} placas de mascota`,
        PetTagService.name,
        'generateBatch',
        this.trackingId
      );

      return newTags.map(tag => ({ qrId: tag.qrId, activationPin: tag.activationPin, assignedStoreName: tag.assignedStoreName }));
    } catch (error) {
      this.logger.error(
        `Error al generar lote de placas de mascota: ${error.message}`,
        error.stack,
        PetTagService.name,
        'generateBatch',
        this.trackingId
      );
      throw new HttpException(
        error.message || 'Error al generar lote de placas de mascota',
        error.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  async findReserved(queryDto: QueryReservedTagsDto) {
    try {
      this.logger.log(
        `Consultando placas reservadas con parÃ¡metros: ${JSON.stringify(queryDto)}`,
        PetTagService.name,
        'findReserved',
        this.trackingId
      );

      const page = queryDto.page || 1;
      const limit = queryDto.limit || 100;
      const skip = (page - 1) * limit;

      // Construir el filtro base
      const query: FilterQuery<PetTag> = {};

      // Agregar filtro de estado si se especifica
      if (queryDto.status) {
        query.status = queryDto.status;
      }
      if (queryDto.commercialStatus) {
        query.commercialStatus = queryDto.commercialStatus;
      }
      if (queryDto.storeName) {
        query.assignedStoreName = { $regex: queryDto.storeName, $options: 'i' };
      }
    

      // Agregar bÃºsqueda por texto si se especifica
      if (queryDto.search) {
        const searchRegex = { $regex: queryDto.search, $options: 'i' };
        query.$or = [
          { idQr: searchRegex },
          { activationPin: searchRegex },
          { 'petData.petName': searchRegex },
          { 'petData.ownerName': searchRegex }
        ];
      }

      // Agregar filtros de fecha si se especifican
      if (queryDto.startDate) {
        query.createdAt = { $gte: new Date(queryDto.startDate) };
      }
      if (queryDto.endDate) {
        if (!query.createdAt) {
          query.createdAt = {};
        }
        query.createdAt.$lte = new Date(queryDto.endDate);
      }

      const [results, total] = await Promise.all([
        this.petTagModel
          .find(query)
          .select('idQr activationPin createdAt status commercialStatus assignedStoreName') 
          .sort({ createdAt: -1 }) // Las mÃ¡s nuevas primero
          .skip(skip)
          .limit(limit)
          .lean(),
        this.petTagModel.countDocuments(query),
      ]);

      this.logger.log(
        `Encontradas ${results.length} placas reservadas`,
        PetTagService.name,
        'findReserved',
        this.trackingId
      );

      return {
        data: results,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(
        `Error al consultar placas reservadas: ${error.message}`,
        error.stack,
        PetTagService.name,
        'findReserved',
        this.trackingId
      );
      throw new HttpException(
        error.message || 'Error al consultar placas reservadas',
        error.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  async getStatus(idQr: string) {
    try {
      this.logger.log(
        `Consultando estado de placa con ID QR: ${idQr}`,
        PetTagService.name,
        'getStatus',
        this.trackingId
      );

      const tag = await this.petTagModel.findOne({ idQr }).select('status petData').lean();
      if (!tag) {
        throw new NotFoundException(`No se encontrÃ³ una placa con ID QR: ${idQr}`);
      }

      this.logger.log(
        `Estado encontrado para ID QR: ${idQr}`,
        PetTagService.name,
        'getStatus',
        this.trackingId
      );

      return tag; // Devuelve { status: '...', petData: '...' }
    } catch (error) {
      this.logger.error(
        `Error al consultar estado de placa: ${error.message}`,
        error.stack,
        PetTagService.name,
        'getStatus',
        this.trackingId
      );
      throw new HttpException(
        error.message || 'Error al consultar estado de placa',
        error.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  async update(petTagIdQr: string, userId: string, dto: UpdatePetTagDto) {
    try {
      this.logger.log(
        `Actualizando datos de placa con ID: ${petTagIdQr} para usuario: ${userId}`,
        PetTagService.name,
        'update',
        this.trackingId
      );
      const userObjectId = new Types.ObjectId(userId);

      const tag = await this.petTagModel.findOne({ idQr: petTagIdQr, userId: userObjectId });
      console.log('tag', tag);
      

      if (!tag) {
        throw new NotFoundException('Placa no encontrada o no pertenece a este usuario.');
      }

      tag.petData = dto.petData;
      await tag.save();

      this.logger.log(
        `Datos actualizados exitosamente para placa ID: ${petTagIdQr}`,
        PetTagService.name,
        'update',
        this.trackingId
      );

      return tag;
    } catch (error) {
      this.logger.error(
        `Error al actualizar datos de placa: ${error.message}`,
        error.stack,
        PetTagService.name,
        'update',
        this.trackingId
      );
      throw new HttpException(
        error.message || 'Error al actualizar datos de placa',
        error.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  async activate(activateDto: ActivatePetTagDto, userId: string) {
    try {
      this.logger.log(
        `Activando placa con ID QR: ${activateDto.idQr} para usuario: ${userId}`,
        PetTagService.name,
        'activate',
        this.trackingId
      );

      const tag = await this.petTagModel.findOne({ idQr: activateDto.idQr, activationPin: activateDto.activationPin }).lean();
      console.log('tag activate', tag);
      
      if (!tag) {
        throw new NotFoundException(`No se encontrÃ³ una placa con ID QR: ${activateDto.idQr}`);
      }

      if (tag.status !== 'RESERVADO') {
        throw new ConflictException(`La placa con ID QR: ${activateDto.idQr} ya estÃ¡ activa`);
      }

      if (tag.activationPin !== activateDto.activationPin) {
        throw new ConflictException(`PIN de activaciÃ³n incorrecto para la placa con ID QR: ${activateDto.idQr}`);
      }

      const updatedTag = await this.petTagModel.findOneAndUpdate(
        { idQr: activateDto.idQr },
        {
          status: 'ACTIVO',
          userId: new Types.ObjectId(userId),
          petData: activateDto.petData,
          expiration: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 aÃ±o desde ahora
          commercialStatus: 'VENDIDO',
        },
        { new: true }
      ).lean();

      this.logger.log(
        `ActivaciÃ³n exitosa de placa con ID QR: ${activateDto.idQr}`,
        PetTagService.name,
        'activate',
        this.trackingId
      );

      return updatedTag;
    } catch (error) {
      this.logger.error(
        `Error al activar placa: ${error.message}`,
        error.stack,
        PetTagService.name,
        'activate',
        this.trackingId
      );
      throw new HttpException(
        error.message || 'Error al activar placa',
        error.status || HttpStatus.BAD_REQUEST
      );
    }
  }
}