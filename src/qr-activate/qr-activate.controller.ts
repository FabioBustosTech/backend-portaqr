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
  Request,
  Req
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { QrActivateService } from './qr-activate.service';
import { CreateQrActivateDto } from './dto/create-qr-activate.dto';
import { UpdateQrActivateDto } from './dto/update-qr-activate.dto';
import { JwtAuthGuard } from '../modules/auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../modules/auth/infrastructure/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CustomLogger } from 'src/shared/utils/logger.util';
import { QrActivate } from './entities/qr-activate.entity';
import { QrActivateResponse, PaginatedQrActivateResponse } from './dto/qr-activate-response.dto';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('QR Activate')
@Controller('qr-activate')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class QrActivateController {
  private readonly logger = new CustomLogger(QrActivateController.name);

  constructor(private readonly qrActivateService: QrActivateService) {}

  @Post()
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Crear nueva activaciÃ³n de QR' })
  @ApiResponse({ status: 201, description: 'ActivaciÃ³n creada exitosamente', type: QrActivate })
  @ApiResponse({ status: 400, description: 'Datos invÃ¡lidos' })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createQrActivateDto: CreateQrActivateDto,
    @Request() req
  ) {
    const trackingId = req['trackingId'];
    try {
      const isAdmin = req.user.role === 'admin';
      if (isAdmin) {
        this.logger.log('Creando nueva activaciÃ³n de QR', QrActivateController.name, 'create', trackingId);
        const activation = await this.qrActivateService.createAdmin(createQrActivateDto, trackingId);
        this.logger.log(`ActivaciÃ³n creada: ${activation._id}`, QrActivateController.name, 'create', trackingId);
        return activation;
      }
      this.logger.log(
        `Creando nueva activaciÃ³n de QR: ${JSON.stringify(createQrActivateDto)}`,
        QrActivateController.name,
        'create',
        trackingId
      );
      const activation = await this.qrActivateService.create(createQrActivateDto, trackingId);
      this.logger.log(
        `ActivaciÃ³n de QR creada exitosamente: ${activation.id}`,
        QrActivateController.name,
        'create',
        trackingId
      );
      return activation;
    } catch (error) {
      this.logger.error(
        `Error al crear activaciÃ³n de QR: ${error.message}`,
        error.stack,
        QrActivateController.name,
        'create',
        trackingId
      );
      throw error;
    }
  }

  @Get()
  @Roles('admin', 'user')
  @ApiOperation({
    summary: 'Obtener todas las activaciones',
    description: 'Obtiene una lista paginada de activaciones de QR con sus relaciones pobladas'
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de activaciones con datos relacionados',
    type: PaginatedQrActivateResponse
  })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
    @Req() req,
    @Query('methodActivation') methodActivation?: string,
  ) {
    const trackingId = req['trackingId'];
    try {
      this.logger.log(
        'Obteniendo todas las activaciones de QR',
        QrActivateController.name,
        'findAll',
        trackingId
      );
      return await this.qrActivateService.findAll(page, limit, search, trackingId, methodActivation);

    } catch (error) {
      this.logger.error(
        `Error al obtener activaciones: ${error.message}`,
        error.stack,
        QrActivateController.name,
        'findAll',
        trackingId
      );
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  @Roles('admin', 'user')
  @ApiOperation({
    summary: 'Obtener una activaciÃ³n por ID',
    description: 'Obtiene una activaciÃ³n especÃ­fica con sus relaciones pobladas'
  })
  @ApiResponse({
    status: 200,
    description: 'ActivaciÃ³n con datos relacionados',
    type: QrActivateResponse
  })
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string, @Req() req) {
    const trackingId = req['trackingId'];
    try {
      this.logger.log(
        `Buscando activaciÃ³n de QR con ID: ${id}`,
        QrActivateController.name,
        'findOne',
        trackingId
      );
      return await this.qrActivateService.findOne(id, trackingId);
    } catch (error) {
      this.logger.error(
        `Error al buscar activaciÃ³n: ${error.message}`,
        error.stack,
        QrActivateController.name,
        'findOne',
        trackingId
      );
      throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch('webpay/:token_ws')
  @Public()
  @ApiOperation({ summary: 'Actualizar estado de activaciÃ³n por token de Webpay' })
  @ApiResponse({ status: 200, description: 'ActivaciÃ³n actualizada', type: QrActivate })
  @ApiResponse({ status: 404, description: 'ActivaciÃ³n no encontrada' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  async updateWebpay(
    @Param('token_ws') token_ws: string,
    @Req() req
  ) {
    const trackingId = req['trackingId'];

    try {
      this.logger.log(`Actualizando estado Webpay: ${token_ws}`, QrActivateController.name, 'updateWebpay', trackingId);
      const activation = await this.qrActivateService.updateWebpay(token_ws, trackingId);
      this.logger.log(`Estado Webpay actualizado: ${activation._id}`, QrActivateController.name, 'updateWebpay', trackingId);
      return activation;
    } catch (error) {
      this.logger.error(`Error al actualizar estado Webpay: ${error.message}`, QrActivateController.name, 'updateWebpay', trackingId);
      throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  
  @Patch(':id')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Actualizar activaciÃ³n' })
  @ApiResponse({ status: 200, description: 'ActivaciÃ³n actualizada', type: QrActivate })
  async update(@Param('id') id: string, @Body() updateQrActivateDto: UpdateQrActivateDto,@Req() req) {
    const trackingId = req['trackingId'];

    try {
      this.logger.log(`Actualizando activaciÃ³n: ${id}`, QrActivateController.name, 'update', trackingId);
      return await this.qrActivateService.update(id, updateQrActivateDto, trackingId);
    } catch (error) {
      this.logger.error(`Error al actualizar activaciÃ³n: ${error.message}`, QrActivateController.name, 'update', trackingId);
      throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Eliminar activaciÃ³n' })
  @ApiResponse({ status: 200, description: 'ActivaciÃ³n eliminada' })
  async remove(@Param('id') id: string,@Req() req) {
    const trackingId = req['trackingId'];

    try {
      this.logger.log(`Eliminando activaciÃ³n: ${id}`, QrActivateController.name, 'remove',trackingId);
      await this.qrActivateService.remove(id,trackingId);
      return { message: 'ActivaciÃ³n eliminada exitosamente' };
    } catch (error) {
      this.logger.error(`Error al eliminar activaciÃ³n: ${error.message}`, QrActivateController.name, 'remove',trackingId);
      throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

}