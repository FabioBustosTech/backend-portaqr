import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/infrastructure/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { Tracking } from 'src/common/decorators/tracking.decorator';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { CreatePlanUseCase } from '../../application/use-cases/create-plan.usecase';
import { GetAllPlanUseCase } from '../../application/use-cases/get-all-plan.usecase';
import { GetPlanUseCase } from '../../application/use-cases/get-plan.usecase';
import { UpdatePlanUseCase } from '../../application/use-cases/update-plan.usecase';
import { DeletePlanUseCase } from '../../application/use-cases/delete-plan.usecase';
import { CreatePlanDto } from '../../application/dto/create-plan.dto';
import { UpdatePlanDto } from '../../application/dto/update-plan.dto';

@ApiTags('Plan')
@Controller('plan')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PlanController {
  constructor(
    private readonly createPlanUseCase: CreatePlanUseCase,
    private readonly getAllPlanUseCase: GetAllPlanUseCase,
    private readonly getPlanUseCase: GetPlanUseCase,
    private readonly updatePlanUseCase: UpdatePlanUseCase,
    private readonly deletePlanUseCase: DeletePlanUseCase,
    private readonly traceService: TraceService,
  ) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Crear un nuevo Plan' })
  @ApiResponse({ status: 201, description: 'Plan creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createPlanDto: CreatePlanDto, @Tracking() tracking: TrackingContext) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'POST /plan', {
      name: createPlanDto.name,
    });
    return this.createPlanUseCase.execute(createPlanDto, tracking);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Obtener todos los Planes' })
  @ApiResponse({ status: 200, description: 'Lista de Planes' })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /plan', {
      page,
      limit,
      search,
    });
    return this.getAllPlanUseCase.execute(page, limit, search, tracking);
  }

  @Get(':id')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Obtener un Plan por ID' })
  @ApiResponse({ status: 200, description: 'Plan encontrado' })
  @ApiResponse({ status: 404, description: 'Plan no encontrado' })
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string, @Tracking() tracking: TrackingContext) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /plan/:id', { id });
    return this.getPlanUseCase.execute(id, tracking);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar un Plan' })
  @ApiResponse({ status: 200, description: 'Plan actualizado' })
  @ApiResponse({ status: 404, description: 'Plan no encontrado' })
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updatePlanDto: UpdatePlanDto,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'PATCH /plan/:id', { id });
    return this.updatePlanUseCase.execute(id, updatePlanDto, tracking);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Eliminar un Plan' })
  @ApiResponse({ status: 200, description: 'Plan eliminado' })
  @ApiResponse({ status: 404, description: 'Plan no encontrado' })
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @Tracking() tracking: TrackingContext) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'DELETE /plan/:id', { id });
    await this.deletePlanUseCase.execute(id, tracking);
    return { message: 'Plan eliminado exitosamente' };
  }
}
