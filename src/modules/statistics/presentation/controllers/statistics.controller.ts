import { Controller, Get, Param, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/infrastructure/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Tracking } from 'src/common/decorators/tracking.decorator';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { GetUserStatisticsUseCase } from '../../application/use-cases/get-user-statistics.usecase';
import { GetSystemStatisticsUseCase } from '../../application/use-cases/get-system-statistics.usecase';

@ApiTags('Estadísticas')
@Controller('statistics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class StatisticsController {
  constructor(
    private readonly getUserStatisticsUseCase: GetUserStatisticsUseCase,
    private readonly getSystemStatisticsUseCase: GetSystemStatisticsUseCase,
    private readonly traceService: TraceService,
  ) {}

  @Get('user/:userId')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Obtener estadísticas de un usuario' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas exitosamente' })
  @HttpCode(HttpStatus.OK)
  async getUserStatistics(
    @Param('userId') userId: string,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /statistics/user/:userId', {
      userId,
    });
    return this.getUserStatisticsUseCase.execute(userId, tracking);
  }

  @Get('system')
  @Roles('admin')
  @ApiOperation({ summary: 'Obtener estadísticas globales del sistema' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas exitosamente' })
  @HttpCode(HttpStatus.OK)
  async getSystemStatistics(@Tracking() tracking: TrackingContext) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /statistics/system', {});
    return this.getSystemStatisticsUseCase.execute(tracking);
  }
}
