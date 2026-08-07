import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  HttpException,
  UseGuards,
  Query,
  HttpCode,
  Req,
  Request
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PlanService } from './plan.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { Plan } from './entities/plan.entity';
import { JwtAuthGuard } from '../modules/auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../modules/auth/infrastructure/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CustomLogger } from 'src/shared/utils/logger.util';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Plan')
@Controller('plan')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PlanController {
  private readonly logger = new CustomLogger(PlanController.name);

  constructor(private readonly planService: PlanService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Crear un nuevo Plan' })
  @ApiResponse({ status: 201, description: 'Plan creado exitosamente', type: Plan })
  @ApiResponse({ status: 400, description: 'Datos invÃ¡lidos' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createPlanDto: CreatePlanDto, @Req() req: Request) {
    const trackingId = req['trackingId'];
    try {
      this.logger.log(
        `Creando nuevo Plan: ${createPlanDto.name}`, 
        PlanController.name, 
        'create',
        trackingId
      );
      const plan = await this.planService.create(createPlanDto, trackingId);
      this.logger.log(
        `Plan creado exitosamente: ${plan.name}`, 
        PlanController.name, 
        'create',
        trackingId
      );
      return plan;
    } catch (error) {
      this.logger.error(
        `Error al crear Plan: ${error.message}`, 
        error.stack,
        PlanController.name, 
        'create',
        trackingId
      );
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Obtener todos los Planes' })
  @ApiResponse({ status: 200, description: 'Lista de Planes', type: [Plan] })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
    @Req() req: Request
  ) {
    const trackingId = req['trackingId'];
    try {
      this.logger.log(
        'Obteniendo lista de Planes', 
        PlanController.name, 
        'findAll',
        trackingId
      );
      const result = await this.planService.findAll(page, limit, search, trackingId);
      return result;
    } catch (error) {
      this.logger.error(
        `Error al obtener Planes: ${error.message}`, 
        error.stack,
        PlanController.name, 
        'findAll',
        trackingId
      );
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Obtener un Plan por ID' })
  @ApiResponse({ status: 200, description: 'Plan encontrado', type: Plan })
  @ApiResponse({ status: 404, description: 'Plan no encontrado' })
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const trackingId = req['trackingId'];
    try {
      this.logger.log(
        `Buscando Plan con ID: ${id}`, 
        PlanController.name, 
        'findOne',
        trackingId
      );
      const plan = await this.planService.findOne(id, trackingId);
      return plan;
    } catch (error) {
      this.logger.error(
        `Error al buscar Plan: ${error.message}`, 
        error.stack,
        PlanController.name, 
        'findOne',
        trackingId
      );
      throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar un Plan' })
  @ApiResponse({ status: 200, description: 'Plan actualizado', type: Plan })
  @ApiResponse({ status: 404, description: 'Plan no encontrado' })
  async update(
    @Param('id') id: string, 
    @Body() updatePlanDto: Partial<CreatePlanDto>,
    @Req() req: Request
  ) {
    const trackingId = req['trackingId'];
    try {
      this.logger.log(
        `Actualizando Plan con ID: ${id}`, 
        PlanController.name, 
        'update',
        trackingId
      );
      const plan = await this.planService.update(id, updatePlanDto, trackingId);
      this.logger.log(
        `Plan actualizado exitosamente: ${id}`, 
        PlanController.name, 
        'update',
        trackingId
      );
      return plan;
    } catch (error) {
      this.logger.error(
        `Error al actualizar Plan: ${error.message}`, 
        error.stack,
        PlanController.name, 
        'update',
        trackingId
      );
      throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Eliminar un Plan' })
  @ApiResponse({ status: 200, description: 'Plan eliminado' })
  @ApiResponse({ status: 404, description: 'Plan no encontrado' })
  async remove(@Param('id') id: string, @Req() req: Request) {
    const trackingId = req['trackingId'];
    try {
      this.logger.log(
        `Eliminando Plan con ID: ${id}`, 
        PlanController.name, 
        'remove',
        trackingId
      );
      await this.planService.remove(id, trackingId);
      this.logger.log(
        `Plan eliminado exitosamente: ${id}`, 
        PlanController.name, 
        'remove',
        trackingId
      );
      return { message: 'Plan eliminado exitosamente' };
    } catch (error) {
      this.logger.error(
        `Error al eliminar Plan: ${error.message}`, 
        error.stack,
        PlanController.name, 
        'remove',
        trackingId
      );
      throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}