import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan, PlanDocument } from './entities/plan.entity';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CustomLogger } from 'src/shared/utils/logger.util';

@Injectable()
export class PlanService {
  private readonly logger = new CustomLogger(PlanService.name);

  constructor(
    @InjectModel(Plan.name) private planModel: Model<PlanDocument>
  ) {}

  async create(createPlanDto: CreatePlanDto, trackingId: string): Promise<PlanDocument> {
    try {
      this.logger.log(
        `Creando nuevo Plan: ${createPlanDto.name}`,
        PlanService.name,
        'create',
        trackingId
      );
      const createdPlan = new this.planModel(createPlanDto);
      const savedPlan = await createdPlan.save();
      this.logger.log(
        `Plan creado exitosamente: ${savedPlan.name}`,
        PlanService.name,
        'create',
        trackingId
      );
      return savedPlan;
    } catch (error) {
      this.logger.error(
        `Error al crear Plan: ${error.message}`,
        error.stack,
        PlanService.name,
        'create',
        trackingId
      );
      throw error;
    }
  }

  async findAll(page: number = 1, limit: number = 10, search: string = '', trackingId: string) {
    try {
      this.logger.log(
        `Buscando planes - page: ${page}, limit: ${limit}, search: ${search}`,
        PlanService.name,
        'findAll',
        trackingId
      );

      const query: any = {};
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { typeQr: { $regex: search, $options: 'i' } },
        ];
      }

      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        this.planModel
          .find(query)
          .sort({ createdDate: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.planModel.countDocuments(query)
      ]);

      const totalPages = Math.ceil(total / limit);

      this.logger.log(
        `Planes encontrados: ${data.length}, total: ${total}`,
        PlanService.name,
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
        `Error en bÃºsqueda paginada: ${error.message}`,
        error.stack,
        PlanService.name,
        'findAll',
        trackingId
      );
      throw error;
    }
  }

  async findOne(id: string, trackingId: string): Promise<PlanDocument> {
    try {
      this.logger.log(
        `Buscando Plan con ID: ${id}`,
        PlanService.name,
        'findOne',
        trackingId
      );
      const plan = await this.planModel.findById(id).exec();
      if (!plan) {
        this.logger.error(
          `Plan con ID ${id} no encontrado`,
          null,
          PlanService.name,
          'findOne',
          trackingId
        );
        throw new NotFoundException(`Plan con ID ${id} no encontrado`);
      }
      return plan;
    } catch (error) {
      this.logger.error(
        `Error al buscar Plan: ${error.message}`,
        error.stack,
        PlanService.name,
        'findOne',
        trackingId
      );
      throw error;
    }
  }

  async update(id: string, updatePlanDto: Partial<CreatePlanDto>, trackingId: string): Promise<PlanDocument> {
    try {
      this.logger.log(
        `Actualizando Plan con ID: ${id}`,
        PlanService.name,
        'update',
        trackingId
      );
      const updatedPlan = await this.planModel
        .findByIdAndUpdate(id, { $set: updatePlanDto }, { new: true })
        .exec();
      
      if (!updatedPlan) {
        this.logger.error(
          `Plan con ID ${id} no encontrado`,
          null,
          PlanService.name,
          'update',
          trackingId
        );
        throw new NotFoundException(`Plan con ID ${id} no encontrado`);
      }

      return updatedPlan;
    } catch (error) {
      this.logger.error(
        `Error al actualizar Plan: ${error.message}`,
        error.stack,
        PlanService.name,
        'update',
        trackingId
      );
      throw error;
    }
  }

  async remove(id: string, trackingId: string): Promise<void> {
    try {
      this.logger.log(
        `Eliminando Plan con ID: ${id}`,
        PlanService.name,
        'remove',
        trackingId
      );
      const result = await this.planModel.findByIdAndDelete(id).exec();
      
      if (!result) {
        this.logger.error(
          `Plan con ID ${id} no encontrado`,
          null,
          PlanService.name,
          'remove',
          trackingId
        );
        throw new NotFoundException(`Plan con ID ${id} no encontrado`);
      }
    } catch (error) {
      this.logger.error(
        `Error al eliminar Plan: ${error.message}`,
        error.stack,
        PlanService.name,
        'remove',
        trackingId
      );
      throw error;
    }
  }
}