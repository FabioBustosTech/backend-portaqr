import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { QrFreeGeneration, QrFreeGenerationDocument } from './entities/qr-free-generation.entity';
import { CreateQrFreeGenerationDto } from './dto/create-qr-free-generation.dto';
import { CustomLogger } from 'src/shared/utils/logger.util';

@Injectable()
export class QrFreeGenerationService {
  private readonly logger = new CustomLogger(QrFreeGenerationService.name);

  constructor(
    @InjectModel(QrFreeGeneration.name)
    private qrFreeGenerationModel: Model<QrFreeGenerationDocument>,
  ) {}

  async create(createQrFreeGenerationDto: CreateQrFreeGenerationDto, trackingId:string): Promise<QrFreeGeneration> {
    try {
      this.logger.log('Creando nuevo QR gratuito', QrFreeGenerationService.name, 'create', trackingId);
      const createdQr = new this.qrFreeGenerationModel(createQrFreeGenerationDto);
      const result = await createdQr.save();
      this.logger.log(`QR gratuito creado exitosamente: ${result}`, QrFreeGenerationService.name, 'create', trackingId);
      return result;
    } catch (error) {
      this.logger.error(`Error al crear QR gratuito: ${error.message}`, error.stack, QrFreeGenerationService.name, 'create', trackingId);
      throw error;
    }
  }

  async findAll(page: number = 1, limit: number = 10, search: string = '', trackingId:string): Promise<{ items: QrFreeGeneration[]; total: number; }> {
    try {
      this.logger.log(`Buscando QRs gratuitos - PÃ¡gina: ${page}, LÃ­mite: ${limit}`, QrFreeGenerationService.name, 'findAll', trackingId);
      
      const skip = (page - 1) * limit;
      let query = {};

      if (search) {
        query = {
          $or: [
            { email: { $regex: search, $options: 'i' } },
            { 'information.data': { $regex: search, $options: 'i' } }
          ]
        };
      }

      const [items, total] = await Promise.all([
        this.qrFreeGenerationModel
          .find(query)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .exec(),
        this.qrFreeGenerationModel.countDocuments(query)
      ]);

      this.logger.log(`Se encontraron ${total} QRs gratuitos`, QrFreeGenerationService.name, 'findAll', trackingId);
      return { items, total };
    } catch (error) {
      this.logger.error(`Error al obtener QRs gratuitos: ${error.message}`, error.stack, QrFreeGenerationService.name, 'findAll', trackingId);
      throw error;
    }
  }

  async findOne(id: string, trackingId:string): Promise<QrFreeGeneration> {
    try {
      this.logger.log(`Buscando QR gratuito: ${id}`, QrFreeGenerationService.name, 'findOne', trackingId);
      const qr = await this.qrFreeGenerationModel.findById(id).exec();
      
      if (!qr) {
        throw new NotFoundException(`QR gratuito con ID ${id} no encontrado`);
      }

      this.logger.log(`QR gratuito encontrado: ${id}`, QrFreeGenerationService.name, 'findOne', trackingId);
      return qr;
    } catch (error) {
      this.logger.error(`Error al buscar QR gratuito: ${error.message}`, error.stack, QrFreeGenerationService.name, 'findOne', trackingId);
      throw error;
    }
  }
}
