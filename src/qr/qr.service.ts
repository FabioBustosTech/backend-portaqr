import { HttpStatus, Injectable, NotFoundException, HttpException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, PipelineStage, Types } from 'mongoose';
import { CreateQrDto } from './dto/create-qr.dto';
import { Qr, QrDocument } from './entities/qr.entity';
import { CustomLogger } from 'src/shared/utils/logger.util';
import { PetTag, PetTagDocument } from 'src/pet-tag/entities/pet-tag.entity';
import { DashboardItem } from './interfaces/dashboard-item.interface';

@Injectable()
export class QrService {
  private readonly logger = new CustomLogger(QrService.name);

  constructor(
    @InjectModel(Qr.name) private qrModel: Model<QrDocument>,
    @InjectModel(PetTag.name) private petTagModel: Model<PetTagDocument>, 

  ) {}

  async create(createQrDto: CreateQrDto, trackingId: string): Promise<QrDocument> {
    try {
      this.logger.log(
        `Creando QR - Datos: ${JSON.stringify(createQrDto)}`,
        QrService.name,
        'create',
        trackingId
      );

      const createdQr = new this.qrModel(createQrDto);
      const qr = await createdQr.save();

      this.logger.log(
        `QR creado exitosamente - ID: ${qr.idQr}`,
        QrService.name,
        'create',
        trackingId
      );

      return qr;
    } catch (error) {
      this.logger.error(
        `Error al crear QR: ${error.message}`,
        error.stack,
        QrService.name,
        'create',
        trackingId
      );
      throw error;
    }
  }

  async getRecentActive(limit: number = 500): Promise<QrDocument[]> {
    try {
      return await this.qrModel
        .find({ active: true })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .exec();
    } catch (error) {
      throw error;
    }
  }

  async findAll(trackingId: string): Promise<QrDocument[]> {
    try {
      this.logger.log(
        `Buscando todos los QRs`,
        QrService.name,
        'findAll',
        trackingId
      );

      const qr = await this.qrModel.find().exec();

      this.logger.log(
        `BÃºsqueda completada - Total: ${qr.length}`,
        QrService.name,
        'findAll',
        trackingId
      );

      return qr;
    } catch (error) {
      this.logger.error(
        `Error en bÃºsqueda: ${error.message}`,
        error.stack,
        QrService.name,
        'findAll',
        trackingId
      );
      throw error;
    }
  }

  async findAllWithSearch(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    trackingId: string
  ): Promise<{ data: QrDocument[]; pagination: any }> {
    try {
      this.logger.log(
        `Buscando todos los QRs con bÃºsqueda - PÃ¡gina: ${page}, LÃ­mite: ${limit}, BÃºsqueda: ${search}`,
        QrService.name,
        'findAllWithSearch',
        trackingId
      );

      let query = {};

      if (search) {
        const typeConditions = {
          social: [
            { typeQr: 'social' },
            { $or: [
              { 'data.username': { $regex: search, $options: 'i' } },
              { 'data.platform': { $regex: search, $options: 'i' } }
            ] }
          ],
          email: [
            { typeQr: 'email' },
            { 'data.email': { $regex: search, $options: 'i' } }
          ],
          whatsapp: [
            { typeQr: 'whatsapp' },
            { $or: [
              { 'data.phone': { $regex: search, $options: 'i' } },
              { 'data.message': { $regex: search, $options: 'i' } }
            ] }
          ],
          pet: [
            { typeQr: 'pet' },
            { $or: [
              { 'data.petName': { $regex: search, $options: 'i' } },
              { 'data.petBreed': { $regex: search, $options: 'i' } },
              { 'data.petData.ownerPhone': { $regex: search, $options: 'i' } }
            ] }
          ],
          phone: [
            { typeQr: 'phone' },
            { 'data.phone': { $regex: search, $options: 'i' } }
          ],
          map: [
            { typeQr: 'map' },
            { $or: [
              { 'data.latitude': { $regex: search, $options: 'i' } },
              { 'data.longitude': { $regex: search, $options: 'i' } },
              { 'data.address': { $regex: search, $options: 'i' } }
            ] }
          ]
        };

        const conditions = {
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
            ...Object.values(typeConditions).flat()
          ]
        };

        query = conditions;
      }

      const offset = (page - 1) * limit;
      const [data, total] = await Promise.all([
        this.qrModel.find(query).skip(offset).limit(limit).exec(),
        this.qrModel.countDocuments(query).exec()
      ]);

      const totalPages = Math.ceil(total / limit);
      this.logger.log(
        `BÃºsqueda completada - Total: ${total}, PÃ¡ginas: ${totalPages}, Resultados: ${data.length}`,
        QrService.name,
        'findAllWithSearch',
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
        `Error en bÃºsqueda con filtros: ${error.message}`,
        error.stack,
        QrService.name,
        'findAllWithSearch',
        trackingId
      );
      throw error;
    }
  }

  async findOne(id: string, trackingId: string): Promise<QrDocument> {
    try {
      this.logger.log(
        `Buscando QR con ID: ${id}`,
        QrService.name,
        'findOne',
        trackingId
      );

      const qr = await this.qrModel.findOne({ idQr: id }).exec();

      if (!qr) {
        this.logger.error(
          `QR no encontrado: ${id}`,
          QrService.name,
          'findOne',
          trackingId
        );
        throw new NotFoundException(`QR no encontrado: ${id}`);
      }

      this.logger.log(
        `QR encontrado - ID: ${id}`,
        QrService.name,
        'findOne',
        trackingId
      );

      return qr;
    } catch (error) {
      this.logger.error(
        `Error al buscar QR: ${error.message}`,
        error.stack,
        QrService.name,
        'findOne',
        trackingId
      );
      throw error;
    }
  }

  async findByUserId(userId: string, trackingId: string): Promise<QrDocument[]> {
    try {
      this.logger.log(
        `Buscando QRs por usuario: ${userId}`,
        QrService.name,
        'findByUserId',
        trackingId
      );

      const qr = await this.qrModel.find({ userId }).exec();

      this.logger.log(
        `BÃºsqueda completada - Total: ${qr.length}`,
        QrService.name,
        'findByUserId',
        trackingId
      );

      return qr;
    } catch (error) {
      this.logger.error(
        `Error en bÃºsqueda: ${error.message}`,
        error.stack,
        QrService.name,
        'findByUserId',
        trackingId
      );
      throw error;
    }
  }

  async update(
    id: string,
    updateQrDto: Partial<CreateQrDto>,
    trackingId: string
  ): Promise<QrDocument> {
    try {
      this.logger.log(
        `Actualizando QR - ID: ${id}, Datos: ${JSON.stringify(updateQrDto)}`,
        QrService.name,
        'update',
        trackingId
      );

      const updatedQr = await this.qrModel
        .findOneAndUpdate({ idQr: id }, updateQrDto, { new: true })
        .exec();

      if (!updatedQr) {
        this.logger.error(
          `QR no encontrado: ${id}`,
          QrService.name,
          'update',
          trackingId
        );
        throw new NotFoundException(`QR no encontrado: ${id}`);
      }

      this.logger.log(
        `QR actualizado exitosamente - ID: ${id}`,
        QrService.name,
        'update',
        trackingId
      );

      return updatedQr;
    } catch (error) {
      this.logger.error(
        `Error al actualizar QR: ${error.message}`,
        error.stack,
        QrService.name,
        'update',
        trackingId
      );
      throw error;
    }
  }

  async remove(id: string, trackingId: string): Promise<boolean> {
    try {
      this.logger.log(
        `Eliminando QR - ID: ${id}`,
        QrService.name,
        'remove',
        trackingId
      );

      const result = await this.qrModel.findOneAndDelete({ idQr: id }).exec();

      if (!result) {
        this.logger.error(
          `QR no encontrado: ${id}`,
          QrService.name,
          'remove',
          trackingId
        );
        throw new NotFoundException(`QR no encontrado: ${id}`);
      }

      this.logger.log(
        `QR eliminado exitosamente: ${id}`,
        QrService.name,
        'remove',
        trackingId
      );

      return true;
    } catch (error) {
      this.logger.error(
        `Error al eliminar QR: ${error.message}`,
        error.stack,
        QrService.name,
        'remove',
        trackingId
      );
      throw error;
    }
  }

  async findPaginatedByUser(
    userId: string,
    page: number = 1,
    limit: number = 10,
    search: string = '',
    trackingId: string
  ): Promise<{ data: QrDocument[]; pagination: any }> {
    try {
      this.logger.log(
        `Iniciando bÃºsqueda paginada para usuario ${userId} - PÃ¡gina: ${page}, LÃ­mite: ${limit}, BÃºsqueda: ${search}`,
        QrService.name,
        'findPaginatedByUser',
        trackingId
      );

      let query = { userId };

      if (search) {
        const typeConditions = {
          social: [
            { typeQr: 'social' },
            { $or: [
              { 'data.username': { $regex: search, $options: 'i' } },
              { 'data.platform': { $regex: search, $options: 'i' } }
            ] }
          ],
          email: [
            { typeQr: 'email' },
            { 'data.email': { $regex: search, $options: 'i' } }
          ],
          whatsapp: [
            { typeQr: 'whatsapp' },
            { $or: [
              { 'data.phone': { $regex: search, $options: 'i' } },
              { 'data.message': { $regex: search, $options: 'i' } }
            ] }
          ],
          pet: [
            { typeQr: 'pet' },
            { $or: [
              { 'data.petName': { $regex: search, $options: 'i' } },
              { 'data.petBreed': { $regex: search, $options: 'i' } },
              { 'data.petData.ownerPhone': { $regex: search, $options: 'i' } }
            ] }
          ],
          phone: [
            { typeQr: 'phone' },
            { 'data.phone': { $regex: search, $options: 'i' } }
          ],
          map: [
            { typeQr: 'map' },
            { $or: [
              { 'data.latitude': { $regex: search, $options: 'i' } },
              { 'data.longitude': { $regex: search, $options: 'i' } },
              { 'data.address': { $regex: search, $options: 'i' } }
            ] }
          ]
        };

        const conditions = {
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
            ...Object.values(typeConditions).flat()
          ]
        };

        query = { ...query, ...conditions };
      }

      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        this.qrModel
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.qrModel.countDocuments(query)
      ]);

      const totalPages = Math.ceil(total / limit);
      this.logger.log(
        `BÃºsqueda completada - Total: ${total}, PÃ¡ginas: ${totalPages}, Resultados: ${data.length}`,
        QrService.name,
        'findPaginatedByUser',
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
        `Error en bÃºsqueda paginada: ${error.message}`,
        error.stack,
        QrService.name,
        'findPaginatedByUser',
        trackingId
      );
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
  trackingId: string
): Promise<{ data: (QrDocument | PetTagDocument)[]; pagination: any }> {
  try {
    const skip = (page - 1) * limit;
    const targetUserIdString = role === 'admin' && userId2 ? userId2 : userId;
    const targetUserId = new Types.ObjectId(targetUserIdString);

    // --- 1. LÃ³gica de BÃºsqueda Completa (Sin Omisiones) ---
    let qrQuery: FilterQuery<QrDocument> = { userId: targetUserId };
    let petTagQuery: FilterQuery<PetTagDocument> = { userId: targetUserId };

    if (search) {
      // Condiciones de bÃºsqueda especÃ­ficas para el modelo Qr
      const typeConditions = {
        social: [{ typeQr: 'social' }, { $or: [{ 'data.username': { $regex: search, $options: 'i' } }, { 'data.platform': { $regex: search, $options: 'i' } }] }],
        email: [{ typeQr: 'email' }, { 'data.email': { $regex: search, $options: 'i' } }],
        whatsapp: [{ typeQr: 'whatsapp' }, { $or: [{ 'data.phone': { $regex: search, $options: 'i' } }, { 'data.message': { $regex: search, $options: 'i' } }] }],
        pet: [{ typeQr: 'pet' }, { $or: [{ 'data.petName': { $regex: search, $options: 'i' } }, { 'data.petBreed': { $regex: search, $options: 'i' } }, { 'data.petData.ownerPhone': { $regex: search, $options: 'i' } }] }],
        phone: [{ typeQr: 'phone' }, { 'data.phone': { $regex: search, $options: 'i' } }],
        map: [{ typeQr: 'map' }, { $or: [{ 'data.latitude': { $regex: search, $options: 'i' } }, { 'data.longitude': { $regex: search, $options: 'i' } }, { 'data.address': { $regex: search, $options: 'i' } }] }]
      };

      qrQuery['$or'] = [
        { idQr: { $regex: search, $options: 'i' } },
        { userId: { $regex: search, $options: 'i' } }, // Nota: esto podrÃ­a traer resultados de otros usuarios si el search es un ObjectId
        { typeQr: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { 'data.urlList.url': { $regex: search, $options: 'i' } },
        { 'data.urlList.typeUrl': { $regex: search, $options: 'i' } },
        { 'data.vcard.fn': { $regex: search, $options: 'i' } },
        { 'data.vcard.org': { $regex: search, $options: 'i' } },
        { 'data.vcard.n.firstName': { $regex: search, $options: 'i' } },
        { 'data.vcard.n.lastName': { $regex: search, $options: 'i' } },
        { 'data.vcard.nickname': { $regex: search, $options: 'i' } },
        ...Object.values(typeConditions).flat()
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

    // --- 2. Obtener Datos y Totales en Paralelo ---
    const [qrResults, petTagResults, totalQrs, totalPetTags] = await Promise.all([
      this.qrModel.find(qrQuery).lean().exec(),
      this.petTagModel.find(petTagQuery).lean().exec(),
      this.qrModel.countDocuments(qrQuery),
      this.petTagModel.countDocuments(petTagQuery)
    ]);

    // --- 3. Unificar, Ordenar y Paginar (Sin Mapeo Inverso) ---
    
    // AÃ±adimos un campo 'type' para que el frontend pueda diferenciar, pero NO modificamos la estructura original
    const allItems = [
      ...qrResults.map(item => ({ ...item, resultType: 'qr' })),
      ...petTagResults.map(item => ({ ...item, resultType: 'pet-tag' }))
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
    const paginatedData = allItems.slice(skip, skip + limit);
    const totalPages = Math.ceil(total / limit);

    this.logger.log(
        `BÃºsqueda completada - Total: ${total}, PÃ¡ginas: ${totalPages}, Resultados: ${paginatedData.length}`,
        'findMyItems',
        trackingId
    );
    
    return {
        data: paginatedData,
        pagination: {
            total,
            totalPages,
            currentPage: page.toString(),
            limit: limit.toString(),
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    };

  } catch (error) {
    this.logger.error(
      `Error en bÃºsqueda de dashboard: ${error.message}`,
      error.stack,
      'findMyItems',
      trackingId
    );
    throw new HttpException('OcurriÃ³ un error al procesar su solicitud.', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
}