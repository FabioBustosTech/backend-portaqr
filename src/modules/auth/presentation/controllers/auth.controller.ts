import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from '../../domain/services/auth.service';
import { LoginDto } from '../../application/dto/login.dto';
import { RefreshTokenDto } from '../../application/dto/refresh-token.dto';
import { JwtAuthGuard } from '../../infrastructure/guards/jwt-auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { Tracking } from '../../../../common/decorators/tracking.decorator';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';

@ApiTags('AutenticaciÃ³n')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly traceService: TraceService,
  ) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesiÃ³n' })
  @ApiResponse({ status: 200, description: 'Login exitoso' })
  @ApiResponse({ status: 401, description: 'Credenciales invÃ¡lidas' })
  async login(@Body() loginDto: LoginDto, @Tracking() tracking: TrackingContext) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'POST /auth/login', {
      username: loginDto.username,
    });
    return this.authService.login(loginDto, tracking);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refrescar el token de acceso' })
  @ApiResponse({ status: 200, description: 'Token de acceso generado exitosamente.' })
  @ApiResponse({ status: 401, description: 'Token de actualizaciÃ³n invÃ¡lido o expirado.' })
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'POST /auth/refresh');
    return this.authService.refreshToken(refreshTokenDto.refreshToken, tracking);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil del usuario' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getProfile(@Request() req, @Tracking() tracking: TrackingContext) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /auth/profile', {
      id: req.user?.id,
    });
    return this.authService.getProfile(req.user.id, tracking);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión (invalida todos los tokens del usuario)' })
  @ApiResponse({ status: 200, description: 'Sesión cerrada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async logout(@Request() req, @Tracking() tracking: TrackingContext) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'POST /auth/logout', {
      id: req.user?.id,
    });
    return this.authService.logout(req.user.id, tracking);
  }
}
