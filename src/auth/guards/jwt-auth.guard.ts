import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CustomLogger } from '../../shared/utils/logger.util';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new CustomLogger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
    this.logger.debug('JwtAuthGuard inicializado', JwtAuthGuard.name, 'constructor');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Primero verificamos si la ruta es pública
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.logger.debug('Ruta pública, permitiendo acceso', JwtAuthGuard.name, 'canActivate');
      return true;
    }

    this.logger.debug('Verificando token JWT', JwtAuthGuard.name, 'canActivate');
    
    try {
      const result = await super.canActivate(context);
      this.logger.debug('Token JWT verificado exitosamente', JwtAuthGuard.name, 'canActivate');
      return result as boolean;
    } catch (error) {
      this.logger.error('Error al verificar token JWT:', error?.message, JwtAuthGuard.name, 'canActivate');
      if (error?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token expirado');
      }
      throw new UnauthorizedException('Token inválido');
    }
  }

  handleRequest(err: any, user: any, info: any) {
    this.logger.debug('Manejando respuesta de autenticación', JwtAuthGuard.name, 'handleRequest');
    
    if (err || !user) {
      this.logger.error('Error de autenticación:', err?.message || 'Usuario no encontrado', JwtAuthGuard.name, 'handleRequest');
      throw err || new UnauthorizedException();
    }
    
    this.logger.debug('Usuario autenticado:', JwtAuthGuard.name, 'handleRequest');
    return user;
  }
}