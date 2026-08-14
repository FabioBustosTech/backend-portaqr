import { Controller, Get, Param, UseGuards, HttpStatus, HttpCode, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/infrastructure/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { GetUser } from 'src/common/decorators/user.decorator';
import { Tracking } from 'src/common/decorators/tracking.decorator';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { GetUserStatisticsUseCase } from '../../application/use-cases/get-user-statistics.usecase';
import { GetSystemStatisticsUseCase } from '../../application/use-cases/get-system-statistics.usecase';

interface AuthenticatedUser {
  id: string;
  role: string;
}

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
  // SPEC-014: owner-or-admin (patrón SPEC-009) — antes @Roles('admin','user') sin
  // ownership: un user veía stats de cualquiera (IDOR). Ahora: user solo sus stats
  // (dashboard propio), admin cualquier usuario.
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Obtener estadísticas de un usuario (propias o admin)' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas exitosamente' })
  @HttpCode(HttpStatus.OK)
  async getUserStatistics(
    @Param('userId') userId: string,
    @GetUser() user: AuthenticatedUser,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /statistics/user/:userId', {
      userId,
    });

    // SPEC-014: un usuario solo ve SUS propias stats; el admin cualquier usuario
    const isAdmin = user.role === 'admin';
    if (!isAdmin && userId !== user.id) {
      this.traceService.warn(
        tracking,
        TraceLayer.CONTROLLER,
        'GET /statistics/user/:userId - forbidden',
        { requester: user.id, target: userId },
      );
      throw new ForbiddenException('No tiene permiso para ver estas estadísticas');
    }

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
