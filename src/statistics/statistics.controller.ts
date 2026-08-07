import { Controller, Get, Param, UseGuards, HttpStatus, HttpException, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { StatisticsService } from './statistics.service';
import { CustomLogger } from 'src/shared/utils/logger.util';

@ApiTags('EstadÃ­sticas')
@Controller('statistics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class StatisticsController {
  private readonly logger = new CustomLogger(StatisticsController.name);

  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('user/:userId')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Obtener estadÃ­sticas de un usuario' })
  @ApiResponse({ status: 200, description: 'EstadÃ­sticas obtenidas exitosamente' })
  async getUserStatistics(@Param('userId') userId: string , @Request() req) {
    const trackingId = req['trackingId'];

    try {
      this.logger.log(`Obteniendo estadÃ­sticas para usuario: ${userId}`, StatisticsController.name, 'getUserStatistics',trackingId);
      const stats = await this.statisticsService.getUserStatistics(userId,trackingId);
      this.logger.log(`EstadÃ­sticas obtenidas exitosamente para usuario: ${userId}`, StatisticsController.name, 'getUserStatistics', trackingId);
      return stats;
    } catch (error) {
      this.logger.error(`Error al obtener estadÃ­sticas de usuario: ${error.message}`, error.stack, StatisticsController.name, 'getUserStatistics', trackingId);
      throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('system')
  @Roles('admin')
  @ApiOperation({ summary: 'Obtener estadÃ­sticas globales del sistema' })
  @ApiResponse({ status: 200, description: 'EstadÃ­sticas obtenidas exitosamente' })
  async getSystemStatistics(@Request() req) {
    const trackingId = req['trackingId'];

    try {
      this.logger.log('Obteniendo estadÃ­sticas globales del sistema', StatisticsController.name, 'getSystemStatistics',trackingId);
      const stats = await this.statisticsService.getSystemStatistics(trackingId);
      this.logger.log('EstadÃ­sticas globales obtenidas exitosamente', StatisticsController.name, 'getSystemStatistics', trackingId);
      return stats;
    } catch (error) {
      this.logger.error(`Error al obtener estadÃ­sticas globales: ${error.message}`, error.stack, StatisticsController.name, 'getSystemStatistics',trackingId);
      throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
} 