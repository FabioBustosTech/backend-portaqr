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
import { GoogleAuthService } from '../../domain/services/google-auth.service';
import { LoginDto } from '../../application/dto/login.dto';
import { RefreshTokenDto } from '../../application/dto/refresh-token.dto';
import { JwtAuthGuard } from '../../infrastructure/guards/jwt-auth.guard';
import { GoogleAuthGuard, GoogleAuthCallbackGuard, readCookie } from '../../infrastructure/guards/google-auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { Tracking } from '../../../../common/decorators/tracking.decorator';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
// SPEC-008 H4 (R4): 5 req/min en login/refresh (anti-bruteforce)
import { Throttle } from '@nestjs/throttler';
import { SENSITIVE_ENDPOINT_THROTTLE } from 'src/common/config/throttle.config';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly traceService: TraceService,
  ) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle(SENSITIVE_ENDPOINT_THROTTLE)
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({ status: 200, description: 'Login exitoso' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(@Body() loginDto: LoginDto, @Tracking() tracking: TrackingContext) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'POST /auth/login', {
      username: loginDto.username,
    });
    return this.authService.login(loginDto, tracking);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle(SENSITIVE_ENDPOINT_THROTTLE)
  @ApiOperation({ summary: 'Refrescar el token de acceso' })
  @ApiResponse({ status: 200, description: 'Token de acceso generado exitosamente.' })
  @ApiResponse({ status: 401, description: 'Token de actualización inválido o expirado.' })
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

  // ═══════════════════════════════════════════════════════════════════════════
  // SPEC-020 RF-7: Google OAuth (ADR-020.3 — el callback pasa por el proxy del
  // frontend /api/auth/google/callback; los tokens nunca viajan en query strings)
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('google')
  @Public()
  @Throttle(SENSITIVE_ENDPOINT_THROTTLE)
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Iniciar flujo OAuth con Google (redirige a accounts.google.com)' })
  @ApiResponse({ status: 302, description: 'Redirect a Google con state + cookie oauth_state' })
  @ApiResponse({ status: 503, description: 'Google OAuth no configurado (faltan credenciales)' })
  async googleAuth() {
    // El guard genera el state + cookie y passport redirige a Google.
    // Sin credenciales configuradas, passport lanza error → 503 (manejado abajo).
  }

  @Get('google/callback')
  @Public()
  @Throttle(SENSITIVE_ENDPOINT_THROTTLE)
  @UseGuards(GoogleAuthCallbackGuard)
  @ApiOperation({ summary: 'Callback de Google OAuth (valida state, crea/vincula cuenta, retorna tokens)' })
  @ApiResponse({ status: 200, description: '{ user, accessToken, refreshToken }' })
  @ApiResponse({ status: 400, description: 'Estado de autenticación inválido (CSRF)' })
  @ApiResponse({ status: 401, description: 'No tienes una cuenta (mode login sin cuenta existente)' })
  async googleCallback(@Request() req, @Tracking() tracking: TrackingContext) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /auth/google/callback', {
      email: req.user?.email,
    });
    // req.user = GoogleProfile (extraído por GoogleStrategy.validate)
    // SPEC-020: el mode ('login' | 'signup') viaja en cookie httpOnly oauth_mode
    // (seteada por GoogleAuthGuard al iniciar el flujo) — el callback lo lee para
    // decidir si crea cuenta (signup) o exige registro previo (login).
    const mode = readCookie(req, 'oauth_mode') === 'login' ? 'login' : 'signup';
    return this.googleAuthService.authenticate(req.user, mode, tracking);
  }
}
