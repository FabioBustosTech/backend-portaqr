import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  HttpException,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/token.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CustomLogger } from '../shared/utils/logger.util';
import { Public } from './decorators/public.decorator';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  private readonly logger = new CustomLogger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({ status: 200, description: 'Login exitoso' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  @HttpCode(HttpStatus.OK)
  @Public()
  async login(@Body() loginDto: LoginDto, @Request() req) {
    const trackingId = req['trackingId'];
 
    try {
      this.logger.log(`Intento de login para usuario: ${loginDto.username}`, AuthController.name, 'login', trackingId);
      const result = await this.authService.login(loginDto, trackingId);
      this.logger.log(`Login exitoso para usuario: ${loginDto.username}`, AuthController.name, 'login', trackingId);
      return result;
    } catch (error) {
      this.logger.error(`Error en login: ${error.message}`, error.stack, AuthController.name, 'login', trackingId);
      throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refrescar el token de acceso', description: 'Genera un nuevo token de acceso utilizando el token de actualización.' })
  @ApiResponse({ status: 200, description: 'Token de acceso generado exitosamente.' })
  @ApiResponse({ status: 401, description: 'Token de actualización inválido o expirado.' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto, @Request() req) {
    const trackingId = req['trackingId'];

    try {
      this.logger.log('Intento de refrescar token', AuthController.name, 'refreshToken', trackingId);
      const result = await this.authService.refreshToken(refreshTokenDto.refreshToken, trackingId);
      this.logger.log('Token refrescado exitosamente', AuthController.name, 'refreshToken', trackingId);
      return result;
    } catch (error) {
      this.logger.error(`Error al refrescar token: ${error.message}`, error.stack, AuthController.name, 'refreshToken', trackingId);
      throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil del usuario' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getProfile(@Request() req) {
    const trackingId = req['trackingId'];

    try {
      this.logger.log(`Obteniendo perfil para usuario ID: ${req.user.id}`, AuthController.name, 'getProfile',trackingId);
      const profile = await this.authService.getProfile(req.user.id, trackingId);
      this.logger.log(`Perfil obtenido exitosamente para usuario ID: ${req.user.id}`, AuthController.name, 'getProfile',trackingId);
      return profile;
    } catch (error) {
      this.logger.error(`Error al obtener perfil: ${error.message}`, error.stack, AuthController.name, 'getProfile',trackingId);
      throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}