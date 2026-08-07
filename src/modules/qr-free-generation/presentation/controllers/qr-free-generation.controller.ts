import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/infrastructure/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { Tracking } from 'src/common/decorators/tracking.decorator';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { CreateQrFreeGenerationUseCase } from '../../application/use-cases/create-qr-free-generation.usecase';
import { GetAllQrFreeGenerationUseCase } from '../../application/use-cases/get-all-qr-free-generation.usecase';
import { GetQrFreeGenerationUseCase } from '../../application/use-cases/get-qr-free-generation.usecase';
import { CreateQrFreeGenerationDto } from '../../application/dto/create-qr-free-generation.dto';

@ApiTags('QR Free Generation')
@Controller('qr-free-generation')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class QrFreeGenerationController {
  constructor(
    private readonly createQrFreeGenerationUseCase: CreateQrFreeGenerationUseCase,
    private readonly getAllQrFreeGenerationUseCase: GetAllQrFreeGenerationUseCase,
    private readonly getQrFreeGenerationUseCase: GetQrFreeGenerationUseCase,
    private readonly traceService: TraceService,
  ) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Crear un nuevo QR gratuito' })
  @ApiResponse({ status: 201, description: 'QR creado exitosamente' })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createQrFreeGenerationDto: CreateQrFreeGenerationDto,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'POST /qr-free-generation', {
      email: createQrFreeGenerationDto.email,
    });
    return this.createQrFreeGenerationUseCase.execute(createQrFreeGenerationDto, tracking);
  }

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Obtener QRs gratuitos paginados' })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página' })
  @ApiQuery({ name: 'limit', required: false, description: 'Límite de registros por página' })
  @ApiQuery({ name: 'search', required: false, description: 'Término de búsqueda' })
  @ApiResponse({ status: 200, description: 'Lista de QRs gratuitos' })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /qr-free-generation', {
      page,
      limit,
      search,
    });
    return this.getAllQrFreeGenerationUseCase.execute(page, limit, search, tracking);
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Obtener un QR gratuito por ID' })
  @ApiParam({ name: 'id', description: 'ID del QR gratuito' })
  @ApiResponse({ status: 200, description: 'QR gratuito encontrado' })
  @ApiResponse({ status: 404, description: 'QR gratuito no encontrado' })
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string, @Tracking() tracking: TrackingContext) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /qr-free-generation/:id', { id });
    return this.getQrFreeGenerationUseCase.execute(id, tracking);
  }
}
