import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateQrActivateDto } from './dto/create-qr-activate.dto';
import { UpdateQrActivateDto } from './dto/update-qr-activate.dto';
import { CustomLogger } from 'src/shared/utils/logger.util';
import { ActivationSate, QrActivate, QrActivateDocument } from './entities/qr-activate.entity';
import { WebpayService } from 'src/webpay/webpay.service';
import { QrService } from 'src/qr/qr.service';

@Injectable()
export class QrActivateService {
  private readonly logger = new CustomLogger(QrActivateService.name);

  constructor(
    @InjectModel(QrActivate.name) private qrActivateModel: Model<QrActivateDocument>,
    private webpayService: WebpayService,
    private qrService: QrService
  ) {}

  async create(createQrActivateDto: CreateQrActivateDto, trackingId: string): Promise<QrActivateDocument> {
    try {
      this.logger.log(
        `Creando nueva activaciÃ³n de QR con datos: ${JSON.stringify(createQrActivateDto)}`,
        QrActivateService.name,
        'create',
        trackingId
      );
      const createdActivation = new this.qrActivateModel(createQrActivateDto);
      const savedActivation = await createdActivation.save();
      this.logger.log(
        `ActivaciÃ³n de QR creada exitosamente con ID: ${savedActivation.id}`,
        QrActivateService.name,
        'create',
        trackingId
      );
      return savedActivation;
    } catch (error) {
      this.logger.error(
        `Error al activar los QR: ${error.message}`,
        error.stack,
        QrActivateService.name,
        'create',
        trackingId
      );
      throw error;
    }
  }

  async createAdmin(createQrActivateDto: CreateQrActivateDto, trackingId:string): Promise<QrActivateDocument> {
    try {
      this.logger.log('Creando nueva activaciÃ³n de QR Administrador', QrActivateService.name, 'create');
      const createdActivation = new this.qrActivateModel(createQrActivateDto);
      const savedActivation = await createdActivation.save();

      this.logger.log(`ActivaciÃ³n los qr de activados a true y se setea su expiracion`, QrActivateService.name, 'updateWebpay',trackingId);
      createQrActivateDto.qrList.map(qr => this.qrService.update(qr.qrCode as unknown as string, { active: true, expiration: qr.expirationDate}, trackingId));

      this.logger.log(`ActivaciÃ³n creada exitosamente: ${savedActivation._id}`, QrActivateService.name, 'create',trackingId);
      return savedActivation;
    } catch (error) {
      this.logger.error(`Error al crear activaciÃ³n: ${error.message}`, QrActivateService.name, 'create',trackingId);
      throw error;
    }
  }

  async findAll( 
    page: number = 1,
    limit: number = 10,
    search: string = '',
    trackingId: string,
    methodActivation?: string,
  ) {
    try {
      this.logger.log(
        'Buscando todas las activaciones de QR',
        QrActivateService.name,
        'findAll',
        trackingId
      );
      const query: any = {};
      const isBooleanString = (str: string) => str.toLowerCase() === 'true' || str.toLowerCase() === 'false';
        const searchBoolean = isBooleanString(search) ? search.toLowerCase() === 'true' : null;

      if (searchBoolean !== null) {
        query.sendDocument = searchBoolean;
      } else if (search) {
        query.$or = [
          { descriptionAdministrator: { $regex: search, $options: 'i' } },
          { 'WebpayTransaction.id': { $regex: search, $options: 'i' } }
        ];
      }

      if (methodActivation) {
        query.methodActivation = methodActivation;
      }
      
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        this.qrActivateModel
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('userId', '_id email name')
          .populate('qrList.qrCode', 'name code')
          .populate('qrList.plan', 'name description')
          .populate('adminId', '_id name')
          .exec(),
        this.qrActivateModel.countDocuments(query)
      ]);

      const totalPages = Math.ceil(total / limit);
      this.logger.log(
        `BÃºsqueda completada - Total: ${total}, PÃ¡ginas: ${totalPages}`,
        QrActivateService.name,
        'findAll',
        trackingId
      );
      return {
        data,
        pagination: {
          total,
          totalPages,
          currentPage: page,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };    
    } catch (error) {
      this.logger.error(
        `Error al buscar activaciones: ${error.message}`,
        error.stack,
        QrActivateService.name,
        'findAll',
        trackingId
      );
      throw error;
    }
  }

  async findOne(id: string, trackingId: string): Promise<QrActivateDocument> {
    try {
      this.logger.log(
        `Buscando activaciÃ³n de QR con ID: ${id}`,
        QrActivateService.name,
        'findOne',
        trackingId
      );
      const activation = await this.qrActivateModel.findById(id)
        .populate('userId', '_id email name')
        .populate('qrList.qrCode', 'name code')
        .populate('qrList.plan', 'name description')
        .populate('adminId', '_id name')
        .exec();
      if (!activation) {
        this.logger.warn(
          `ActivaciÃ³n de QR no encontrada con ID: ${id}`,
          QrActivateService.name,
          'findOne',
          trackingId
        );
        throw new NotFoundException(`ActivaciÃ³n con ID ${id} no encontrada`);
      }
      return activation;
    } catch (error) {
      this.logger.error(
        `Error al buscar activaciÃ³n: ${error.message}`,
        error.stack,
        QrActivateService.name,
        'findOne',
        trackingId
      );
      throw error;
    }
  }

  async update(id: string, updateQrActivateDto: UpdateQrActivateDto, trackingId:string): Promise<QrActivateDocument> {
    try {
      this.logger.log(`Actualizando activaciÃ³n con ID: ${id}`, QrActivateService.name, 'update',trackingId);
      const updatedActivation = await this.qrActivateModel
        .findByIdAndUpdate(id, updateQrActivateDto, { new: true })
        .exec();
      
      if (!updatedActivation) {
        this.logger.warn(`ActivaciÃ³n con ID ${id} no encontrada`, QrActivateService.name, 'update',trackingId);
        throw new NotFoundException(`ActivaciÃ³n con ID ${id} no encontrada`);
      }

      return updatedActivation;
    } catch (error) {
      this.logger.error(`Error al actualizar activaciÃ³n: ${error.message}`, QrActivateService.name, 'update',trackingId);
      throw error;
    }
  }

  async updateWebpay(token_ws: string, trackingId:string): Promise<QrActivateDocument> {
    try {
      this.logger.log(
        `Actualizando Webpay activaciÃ³n con ID: ${token_ws}`,
         QrActivateService.name,
        'updateWebpay',
        trackingId
      );

      const activation = await this.qrActivateModel.findOne({
        'WebpayTransaction.id': token_ws
      }).exec();

      if (!activation) {
        this.logger.warn(
          `ActivaciÃ³n con token_ws ${token_ws} no encontrada`, 
          QrActivateService.name, 
          'updateWebpay',
          trackingId
        );

        throw new NotFoundException(`ActivaciÃ³n con token_ws ${token_ws} no encontrada`);
      }
      if(activation.state !== ActivationSate.PENDING) { 
        this.logger.warn(
          `ActivaciÃ³n con token_ws ${token_ws} ya fue procesada `,
           QrActivateService.name,
            'updateWebpay',
            trackingId
        );
        return activation;
      }

      const WebpayTransactionUpdateDto = await this.webpayService.commitTransaction(token_ws, trackingId);

      if (!WebpayTransactionUpdateDto) {
        this.logger.warn(`Error al actualizar Webpay transaction con token_ws: ${token_ws}`, QrActivateService.name, 'updateWebpay',trackingId);
        throw new Error('Error al actualizar Webpay transaction');
      }

      activation.WebpayTransaction.state = WebpayTransactionUpdateDto.status;

      if (activation.WebpayTransaction.state === 'AUTHORIZED') {
        this.logger.log(`ActivaciÃ³n con token_ws ${token_ws} actualizada a PAGADO`, QrActivateService.name, 'updateWebpay');
        activation.state = ActivationSate.PAYED;

        this.logger.log(`ActivaciÃ³n los qr de activados a true y se setea su expiracion`, QrActivateService.name, 'updateWebpay',trackingId);
        activation.qrList.map(qr => this.qrService.update(qr.qrCode as unknown as string, { active: true, expiration: qr.expirationDate}, 'WEBPAY_ACTION'));
      } else {
        activation.state = ActivationSate.FAILED;
      }

      this.logger.log(`Se guardan los cambio de la activaciÃ³n `, QrActivateService.name, 'updateWebpay',trackingId);

      activation.save();


      this.logger.log(`Activacion guardada con Exito `, QrActivateService.name, 'updateWebpay',trackingId);

      return activation;

    } catch (error) {
      this.logger.error(`Error al actualizar activaciÃ³n: ${error.message}`, QrActivateService.name, 'updateWebpay',trackingId);
      throw error;
    }
  }

  async remove(id: string, trackingId:string): Promise<boolean> {
    try {
      this.logger.log(`Eliminando activaciÃ³n con ID: ${id}`, QrActivateService.name, 'remove',trackingId);
      const result = await this.qrActivateModel.findByIdAndDelete(id).exec();
      
      if (!result) {
        this.logger.warn(`ActivaciÃ³n con ID ${id} no encontrada`, QrActivateService.name, 'remove',trackingId);
        throw new NotFoundException(`ActivaciÃ³n con ID ${id} no encontrada`);
      }

      return true;
    } catch (error) {
      this.logger.error(`Error al eliminar activaciÃ³n: ${error.message}`, QrActivateService.name, 'remove',trackingId);
      throw error;
    }
  }
}