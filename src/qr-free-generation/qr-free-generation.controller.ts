import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
  HttpCode,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { QrFreeGenerationService } from './qr-free-generation.service';
import { CreateQrFreeGenerationDto } from './dto/create-qr-free-generation.dto';
import { QrFreeGeneration } from './entities/qr-free-generation.entity';
import { CustomLogger } from 'src/shared/utils/logger.util';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/infrastructure/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('QR Free Generation')
@Controller('qr-free-generation')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class QrFreeGenerationController {
  private readonly logger = new CustomLogger(QrFreeGenerationController.name);

  constructor(private readonly qrFreeGenerationService: QrFreeGenerationService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo QR gratuito' })
  @ApiResponse({ status: 201, description: 'QR creado exitosamente', type: QrFreeGeneration })
  @HttpCode(HttpStatus.CREATED)
  @Public()
  async create(@Body() createQrFreeGenerationDto: CreateQrFreeGenerationDto, @Request() req) {
    const trackingId = req['trackingId'];

    try {
      this.logger.log('Creando nuevo QR gratuito', QrFreeGenerationController.name, 'create', trackingId);
      const result = await this.qrFreeGenerationService.create(createQrFreeGenerationDto, trackingId);
      this.logger.log(`QR gratuito creado exitosamente: ${result}`, QrFreeGenerationController.name, 'create', trackingId);
      return result;
    } catch (error) {
      this.logger.error(`Error al crear QR gratuito: ${error.message}`, error.stack, QrFreeGenerationController.name, 'create', trackingId);
      throw new HttpException(error.message || 'Error al crear QR gratuito', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Obtener QRs gratuitos paginados' })
  @ApiQuery({ name: 'page', required: false, description: 'NÃºmero de pÃ¡gina' })
  @ApiQuery({ name: 'limit', required: false, description: 'LÃ­mite de registros por pÃ¡gina' })
  @ApiQuery({ name: 'search', required: false, description: 'TÃ©rmino de bÃºsqueda' })
  @ApiResponse({ status: 200, description: 'Lista de QRs gratuitos', type: [QrFreeGeneration] })
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
    @Request() req
  ) {
    const trackingId = req['trackingId'];

    try {
      this.logger.log(`Obteniendo QRs gratuitos - PÃ¡gina: ${page}, LÃ­mite: ${limit}`, QrFreeGenerationController.name, 'findAll', trackingId);
      const result = await this.qrFreeGenerationService.findAll(page, limit, search, trackingId);
      this.logger.log(`QRs gratuitos obtenidos exitosamente`, QrFreeGenerationController.name, 'findAll', trackingId);
      return result;
    } catch (error) {
      this.logger.error(`Error al obtener QRs gratuitos: ${error.message}`, error.stack, QrFreeGenerationController.name, 'findAll', trackingId);
      throw new HttpException(error.message || 'Error al obtener QRs gratuitos', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un QR gratuito por ID' })
  @ApiParam({ name: 'id', description: 'ID del QR gratuito' })
  @ApiResponse({ status: 200, description: 'QR gratuito encontrado', type: QrFreeGeneration })
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  async findOne(@Param('id') id: string, @Request() req) {
    const trackingId = req['trackingId'];

    try {
      this.logger.log(`Buscando QR gratuito: ${id}`, QrFreeGenerationController.name, 'findOne', trackingId);
      const result = await this.qrFreeGenerationService.findOne(id, trackingId);
      this.logger.log(`QR gratuito encontrado: ${id}`, QrFreeGenerationController.name, 'findOne', trackingId);
      return result;
    } catch (error) {
      this.logger.error(`Error al buscar QR gratuito: ${error.message}`, error.stack, QrFreeGenerationController.name, 'findOne', trackingId);
      throw new HttpException(error.message || 'Error al buscar QR gratuito', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
