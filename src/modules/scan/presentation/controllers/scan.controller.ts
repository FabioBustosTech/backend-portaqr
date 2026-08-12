import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Query,
  HttpStatus,
  NotFoundException,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/infrastructure/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { GetUser } from 'src/common/decorators/user.decorator';
import { CreateScanUseCase } from '../../application/use-cases/create-scan.usecase';
import { GetScanStatsUseCase } from '../../application/use-cases/get-scan-stats.usecase';
import { GetRecentScansUseCase } from '../../application/use-cases/get-recent-scans.usecase';
import { GetDailyScanStatsUseCase } from '../../application/use-cases/get-daily-scan-stats.usecase';
import { GetLocationScanStatsUseCase } from '../../application/use-cases/get-location-scan-stats.usecase';
import { GetDeviceScanStatsUseCase } from '../../application/use-cases/get-device-scan-stats.usecase';
import { GetQrUseCase } from '../../../qr/application/use-cases/get-qr.usecase';
import { CreateScanDto } from '../../application/dto/create-scan.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { Tracking } from 'src/common/decorators/tracking.decorator';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { assertOwnerOrAdmin } from 'src/common/utils/ownership.utils';

interface AuthenticatedUser {
  id: string;
  role: string;
}

@ApiTags('Escaneos')
@Controller('scan')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ScanController {
  constructor(
    private readonly createScanUseCase: CreateScanUseCase,
    private readonly getScanStatsUseCase: GetScanStatsUseCase,
    private readonly getRecentScansUseCase: GetRecentScansUseCase,
    private readonly getDailyScanStatsUseCase: GetDailyScanStatsUseCase,
    private readonly getLocationScanStatsUseCase: GetLocationScanStatsUseCase,
    private readonly getDeviceScanStatsUseCase: GetDeviceScanStatsUseCase,
    private readonly getQrUseCase: GetQrUseCase,
    private readonly traceService: TraceService,
  ) {}

  @Post('stats')
  @Public()
  @ApiOperation({ summary: 'Registra un nuevo escaneo de código QR' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Escaneo registrado exitosamente' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Datos de entrada inválidos' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createScanDto: CreateScanDto, @Tracking() tracking: TrackingContext) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'POST /scan/stats', {
      idQr: createScanDto.idQr,
      city: createScanDto.location?.city,
    });
    return this.createScanUseCase.execute(createScanDto, tracking);
  }

  /**
   * SPEC-009 A7: carga el QR (404 si no existe) y verifica ownership — dueño o admin.
   * Lanza 404 si el QR no existe, 403 si el actor no es dueño ni admin.
   */
  private async loadQrWithOwnership(
    idQr: string,
    user: AuthenticatedUser,
    tracking: TrackingContext,
  ): Promise<void> {
    const qr = await this.getQrUseCase.execute(idQr, tracking); // 404 si no existe
    assertOwnerOrAdmin(qr.userId, user, 'No tiene permiso para ver las estadísticas de este QR.');
  }

  @Get(':idQr/stats')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Obtiene estadísticas de escaneos de un código QR' })
  @ApiParam({ name: 'idQr', description: 'ID del código QR' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Estadísticas obtenidas exitosamente' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'No autorizado' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Código QR no encontrado' })
  @HttpCode(HttpStatus.OK)
  async getStats(
    @Param('idQr') idQr: string,
    @GetUser() user: AuthenticatedUser,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /scan/:idQr/stats', { idQr });
    await this.loadQrWithOwnership(idQr, user, tracking);

    const stats = await this.getScanStatsUseCase.execute(idQr, tracking);

    if (!stats) {
      this.traceService.warn(tracking, TraceLayer.CONTROLLER, 'GET /scan/:idQr/stats - not found', {
        idQr,
      });
      throw new NotFoundException('No se encontraron estadísticas para el código QR');
    }

    return stats;
  }

  @Get(':idQr/recent')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Obtiene los escaneos más recientes de un código QR' })
  @ApiParam({ name: 'idQr', description: 'ID del código QR' })
  @ApiQuery({ name: 'limit', description: 'Número máximo de registros a retornar', required: false })
  @ApiResponse({ status: HttpStatus.OK, description: 'Escaneos recientes obtenidos exitosamente' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'No autorizado' })
  @HttpCode(HttpStatus.OK)
  async getRecentScans(
    @Param('idQr') idQr: string,
    @Query('limit') limit: number = 10,
    @GetUser() user: AuthenticatedUser,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /scan/:idQr/recent', {
      idQr,
      limit,
    });
    await this.loadQrWithOwnership(idQr, user, tracking);
    return this.getRecentScansUseCase.execute(idQr, limit, tracking);
  }

  @Get(':idQr/daily')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Obtiene estadísticas diarias de escaneos' })
  @ApiParam({ name: 'idQr', description: 'ID del código QR' })
  @ApiQuery({ name: 'days', description: 'Número de días a consultar', required: false })
  @ApiResponse({ status: HttpStatus.OK, description: 'Estadísticas diarias obtenidas exitosamente' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'No autorizado' })
  @HttpCode(HttpStatus.OK)
  async getDailyStats(
    @Param('idQr') idQr: string,
    @Query('days') days: number = 30,
    @GetUser() user: AuthenticatedUser,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /scan/:idQr/daily', {
      idQr,
      days,
    });
    await this.loadQrWithOwnership(idQr, user, tracking);
    return this.getDailyScanStatsUseCase.execute(idQr, days, tracking);
  }

  @Get(':idQr/locations')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Obtiene estadísticas de ubicaciones de escaneos' })
  @ApiParam({ name: 'idQr', description: 'ID del código QR' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Estadísticas de ubicaciones obtenidas exitosamente' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'No autorizado' })
  @HttpCode(HttpStatus.OK)
  async getLocationStats(
    @Param('idQr') idQr: string,
    @GetUser() user: AuthenticatedUser,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /scan/:idQr/locations', { idQr });
    await this.loadQrWithOwnership(idQr, user, tracking);
    return this.getLocationScanStatsUseCase.execute(idQr, tracking);
  }

  @Get(':idQr/devices')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Obtiene estadísticas de dispositivos de escaneos' })
  @ApiParam({ name: 'idQr', description: 'ID del código QR' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Estadísticas de dispositivos obtenidas exitosamente' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'No autorizado' })
  @HttpCode(HttpStatus.OK)
  async getDeviceStats(
    @Param('idQr') idQr: string,
    @GetUser() user: AuthenticatedUser,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /scan/:idQr/devices', { idQr });
    await this.loadQrWithOwnership(idQr, user, tracking);
    return this.getDeviceScanStatsUseCase.execute(idQr, tracking);
  }
}
