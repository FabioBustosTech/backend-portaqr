import { Controller, Post, Get, Body, Param, UseGuards, Query, HttpStatus, NotFoundException, BadRequestException, HttpCode,Request } from '@nestjs/common';
import { JwtAuthGuard } from '../modules/auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../modules/auth/infrastructure/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ScanService } from './scan.service';
import { CreateScanDto } from './dto/create-scan.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { CustomLogger } from 'src/shared/utils/logger.util';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Escaneos')
@Controller('scan')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ScanController {
  private readonly logger = new CustomLogger(ScanController.name);

  constructor(private readonly scanService: ScanService) {}

  @Post('stats')
  @Public()
  @ApiOperation({ summary: 'Registra un nuevo escaneo de cÃ³digo QR' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Escaneo registrado exitosamente' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Datos de entrada invÃ¡lidos' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createScanDto: CreateScanDto, @Request() req) {
    const trackingId = req['trackingId'];

    try {
      this.logger.log(
        `Iniciando registro de escaneo para idQr: ${createScanDto.idQr} desde ${createScanDto.location?.city}`,
        ScanController.name,
        'create'
      );

      const result = await this.scanService.create(createScanDto, trackingId);

      this.logger.log(
        `Escaneo registrado exitosamente - ID: ${result._id}, idQr: ${result.idQr}`,
        ScanController.name,
        'create'
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Error al registrar escaneo para idQr: ${createScanDto.idQr} - ${error.message}`,
        error.stack,
        ScanController.name,
        'create'
      );
      throw new BadRequestException('Error al registrar el escaneo');
    }
  }

  @Get(':idQr/stats')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Obtiene estadÃ­sticas de escaneos de un cÃ³digo QR' })
  @ApiParam({ name: 'idQr', description: 'ID del cÃ³digo QR' })
  @ApiResponse({ status: HttpStatus.OK, description: 'EstadÃ­sticas obtenidas exitosamente' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'No autorizado' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'CÃ³digo QR no encontrado' })
  @HttpCode(HttpStatus.OK)
  async getStats(@Param('idQr') idQr: string, @Request() req) {
    const trackingId = req['trackingId'];

    try {
      this.logger.log(
        `Obteniendo estadÃ­sticas para idQr: ${idQr}`,
        ScanController.name,
        'getStats',
        trackingId
      );

      const stats = await this.scanService.getStatsByQrId(idQr, trackingId);
      
      if (!stats) {
        this.logger.warn(
          `No se encontraron estadÃ­sticas para idQr: ${idQr}`,
          ScanController.name,
          'getStats',
          trackingId
        );
        throw new NotFoundException('No se encontraron estadÃ­sticas para el cÃ³digo QR');
      }

      this.logger.log(
        `EstadÃ­sticas obtenidas exitosamente para idQr: ${idQr} - Total: ${stats.totalScans}`,
        ScanController.name,
        'getStats',
        trackingId
      );

      return stats;
    } catch (error) {
      this.logger.error(
        `Error al obtener estadÃ­sticas para idQr: ${idQr} - ${error.message}`,
        error.stack,
        ScanController.name,
        'getStats',
        trackingId
      );
      throw error;
    }
  }

  @Get(':idQr/recent')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Obtiene los escaneos mÃ¡s recientes de un cÃ³digo QR' })
  @ApiParam({ name: 'idQr', description: 'ID del cÃ³digo QR' })
  @ApiQuery({ name: 'limit', description: 'NÃºmero mÃ¡ximo de registros a retornar', required: false })
  @ApiResponse({ status: HttpStatus.OK, description: 'Escaneos recientes obtenidos exitosamente' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'No autorizado' })
  @HttpCode(HttpStatus.OK)
  async getRecentScans(
    @Param('idQr') idQr: string,
    @Query('limit') limit: number = 10,
    @Request() req
  ) {
    const trackingId = req['trackingId'];

    try {
      this.logger.log(
        `Obteniendo escaneos recientes para idQr: ${idQr}, lÃ­mite: ${limit}`,
        ScanController.name,
        'getRecentScans',
        trackingId
      );

      const scans = await this.scanService.getRecentScans(idQr, limit,trackingId);

      this.logger.log(
        `Escaneos recientes obtenidos exitosamente para idQr: ${idQr} - Total: ${scans.length}`,
        ScanController.name,
        'getRecentScans',
        trackingId
      );

      return scans;
    } catch (error) {
      this.logger.error(
        `Error al obtener escaneos recientes para idQr: ${idQr} - ${error.message}`,
        error.stack,
        ScanController.name,
        'getRecentScans',
        trackingId
      );
      throw error;
    }
  }

  @Get(':idQr/daily')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Obtiene estadÃ­sticas diarias de escaneos' })
  @ApiParam({ name: 'idQr', description: 'ID del cÃ³digo QR' })
  @ApiQuery({ name: 'days', description: 'NÃºmero de dÃ­as a consultar', required: false })
  @ApiResponse({ status: HttpStatus.OK, description: 'EstadÃ­sticas diarias obtenidas exitosamente' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'No autorizado' })
  @HttpCode(HttpStatus.OK)
  async getDailyStats(
    @Param('idQr') idQr: string,
    @Query('days') days: number = 30,
    @Request() req
  ) {
    const trackingId = req['trackingId'];

    try {
      this.logger.log(
        `Obteniendo estadÃ­sticas diarias para idQr: ${idQr}, dÃ­as: ${days}`,
        ScanController.name,
        'getDailyStats',
        trackingId
      );

      const stats = await this.scanService.getDailyStats(idQr, days, trackingId);

      this.logger.log(
        `EstadÃ­sticas diarias obtenidas exitosamente para idQr: ${idQr} - Total dÃ­as: ${stats.length}`,
        ScanController.name,
        'getDailyStats',
        trackingId
      );

      return stats;
    } catch (error) {
      this.logger.error(
        `Error al obtener estadÃ­sticas diarias para idQr: ${idQr} - ${error.message}`,
        error.stack,
        ScanController.name,
        'getDailyStats',
        trackingId
      );
      throw error;
    }
  }

  @Get(':idQr/locations')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Obtiene estadÃ­sticas de ubicaciones de escaneos' })
  @ApiParam({ name: 'idQr', description: 'ID del cÃ³digo QR' })
  @ApiResponse({ status: HttpStatus.OK, description: 'EstadÃ­sticas de ubicaciones obtenidas exitosamente' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'No autorizado' })
  @HttpCode(HttpStatus.OK)
  async getLocationStats(@Param('idQr') idQr: string, @Request() req) {
    const trackingId = req['trackingId'];

    try {
      this.logger.log(
        `Obteniendo estadÃ­sticas de ubicaciones para idQr: ${idQr}`,
        ScanController.name,
        'getLocationStats',
        trackingId
      );

      const stats = await this.scanService.getLocationStats(idQr, trackingId);

      this.logger.log(
        `EstadÃ­sticas de ubicaciones obtenidas exitosamente para idQr: ${idQr} - Total ubicaciones: ${stats.length}`,
        ScanController.name,
        'getLocationStats',
        trackingId
      );

      return stats;
    } catch (error) {
      this.logger.error(
        `Error al obtener estadÃ­sticas de ubicaciones para idQr: ${idQr} - ${error.message}`,
        error.stack,
        ScanController.name,
        'getLocationStats',
        trackingId
      );
      throw error;
    }
  }

  @Get(':idQr/devices')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Obtiene estadÃ­sticas de dispositivos de escaneos' })
  @ApiParam({ name: 'idQr', description: 'ID del cÃ³digo QR' })
  @ApiResponse({ status: HttpStatus.OK, description: 'EstadÃ­sticas de dispositivos obtenidas exitosamente' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'No autorizado' })
  @HttpCode(HttpStatus.OK)
  async getDeviceStats(@Param('idQr') idQr: string, @Request() req) {
    const trackingId = req['trackingId'];

    try {
      this.logger.log(
        `Obteniendo estadÃ­sticas de dispositivos para idQr: ${idQr}`,
        ScanController.name,
        'getDeviceStats',
        trackingId
      );

      const stats = await this.scanService.getDeviceStats(idQr, trackingId);

      this.logger.log(
        `EstadÃ­sticas de dispositivos obtenidas exitosamente para idQr: ${idQr} - Total dispositivos: ${stats.length}`,
        ScanController.name,
        'getDeviceStats',
        trackingId
      );

      return stats;
    } catch (error) {
      this.logger.error(
        `Error al obtener estadÃ­sticas de dispositivos para idQr: ${idQr} - ${error.message}`,
        error.stack,
        ScanController.name,
        'getDeviceStats',
        trackingId
      );
      throw error;
    }
  }
} 