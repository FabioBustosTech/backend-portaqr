import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  HttpCode,
  UseGuards,
  Request,
  BadRequestException,
  Query,
  HttpException,
  ForbiddenException,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CustomLogger } from '../shared/utils/logger.util';
import { ChangePasswordDto } from './dto/ChangePassword.dto';
import { GetUser } from '../auth/decorators/user.decorator';
import { User } from './entities/user.entity';
import { Public } from '../auth/decorators/public.decorator';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
@ApiTags('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  private readonly logger = new CustomLogger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Post(':id/verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar email de usuario' })
  @ApiResponse({ status: 200, description: 'Email verificado exitosamente' })
  @ApiResponse({ status: 400, description: 'Código inválido o expirado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async verifyEmail(
    @Param('id') id: string,
    @Body('code') code: string,
    @Request() req
  ) {
    const trackingId = req['trackingId'];

    this.logger.log(`Verificando email para usuario: ${id}`, UsersController.name, 'verifyEmail', trackingId);
    try {
      await this.usersService.verifyEmail(id, code, trackingId);
      return { message: 'Email verificado exitosamente' };
    } catch (error) {
      this.logger.error(`Error al verificar email: ${error.message}`, error.stack, UsersController.name, 'verifyEmail', trackingId);
      throw error;
    }
  }

  @Post(':id/resend-verification')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reenviar código de verificación' })
  @ApiResponse({ status: 200, description: 'Código reenviado exitosamente' })
  @ApiResponse({ status: 400, description: 'Email ya verificado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async resendVerificationCode(
    @Param('id') id: string,
    @Request() req
  ) {
    const trackingId = req['trackingId'];

    this.logger.log(`Reenviando código de verificación para usuario: ${id}`, UsersController.name, 'resendVerificationCode', trackingId);
    try {
      await this.usersService.resendVerificationCode(id, trackingId);
      return { message: 'Código de verificación reenviado exitosamente' };
    } catch (error) {
      this.logger.error(`Error al reenviar código: ${error.message}`, error.stack, UsersController.name, 'resendVerificationCode', trackingId);
      throw error;
    }
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar recuperación de contraseña' })
  @ApiResponse({ status: 200, description: 'Código de recuperación enviado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async forgotPassword(
    @Body('email') email: string,
    @Request() req
  ) {
    const trackingId = req['trackingId'];

    this.logger.log(`Solicitando recuperación de contraseña para: ${email}`, UsersController.name, 'forgotPassword', trackingId);
    try {
      await this.usersService.sendPasswordResetEmail(email, trackingId);
      return { message: 'Código de recuperación enviado exitosamente' };
    } catch (error) {
      this.logger.error(`Error al solicitar recuperación: ${error.message}`, error.stack, UsersController.name, 'forgotPassword', trackingId);
      throw error;
    }
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resetear contraseña' })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada exitosamente' })
  @ApiResponse({ status: 400, description: 'Código inválido o expirado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async resetPassword(
    @Body('email') email: string,
    @Body('code') code: string,
    @Body('newPassword') newPassword: string,
    @Request() req
  ) {
    const trackingId = req['trackingId'];

    this.logger.log(`Reseteando contraseña para: ${email}`, UsersController.name, 'resetPassword', trackingId);
    try {
      await this.usersService.resetPassword(email, code, newPassword, trackingId);
      return { message: 'Contraseña actualizada exitosamente' };
    } catch (error) {
      this.logger.error(`Error al resetear contraseña: ${error.message}`, error.stack, UsersController.name, 'resetPassword', trackingId);
      throw error;
    }
  }

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un nuevo Usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente', type: User })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene los permisos necesarios' })
  async create(@Body() createUserDto: CreateUserDto, @Request() req) {
    const trackingId = req['trackingId'];

    this.logger.log(`Creando nuevo usuario con email: ${createUserDto.email}`, UsersController.name, 'create');
    try {
      const result = await this.usersService.create(createUserDto, trackingId);
      this.logger.log(`Usuario creado exitosamente: ${result.email}`, UsersController.name, 'create');
      return result;
    } catch (error) {
      this.logger.error(`Error al crear usuario: ${error.message}`, error.stack, UsersController.name, 'create', trackingId);
      throw error;
    }
  }

  @Get('check-username/:userName')
  @HttpCode(HttpStatus.OK)
  @Public()
  async checkUserNameExists(@Param('userName') userName: string, @Request() req): Promise<{ exists: boolean }> {
    const trackingId = req['trackingId'];

    try {

      this.logger.log(`Verificando disponibilidad de nombre de usuario: ${userName}`, UsersController.name, 'checkUserNameExists', trackingId);
      const exists = await this.usersService.checkUserNameExists(userName, trackingId);
      return { exists };
    } catch (error) {
      this.logger.error(`Error al verificar disponibilidad de nombre de usuario: ${error.message}`, error.stack, UsersController.name, 'checkUserNameExists', trackingId);
      throw new HttpException(
        error.message|| 'Error al verificar disponibilidad de nombre de usuario',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
 
  }

  @Get('check-email/:email')
  @HttpCode(HttpStatus.OK)
  @Public()
  async checkEmailExists(@Param('email') email: string, @Request() req): Promise<{ exists: boolean }> {
    const trackingId = req['trackingId'];

    try {
      this.logger.log(`Verificando disponibilidad de email: ${email}`, UsersController.name, 'checkEmailExists', trackingId);
      const exists = await this.usersService.checkEmailExists(email, trackingId);
      return { exists };
    } catch (error) {
      this.logger.error(`Error al verificar disponibilidad de email: ${error.message}`, error.stack, UsersController.name, 'checkEmailExists', trackingId);
      throw new HttpException(
        error.message || 'Error al verificar disponibilidad de email',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
    
  }

  @Get('search')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Obtener todos los Usuarios' })
  @ApiResponse({ status: 200, description: 'Lista de usuario', type: [User] })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene los permisos necesarios' })
  async findByUsername(@Param('username') username: string, @Request() req) {
    const trackingId = req['trackingId'];

    this.logger.log(`Buscando usuario por username/email: ${username}`, UsersController.name, 'findByUsername');
    if (!username) {
      throw new BadRequestException('El parámetro username es requerido', trackingId);
    }
    try {
      const user = await this.usersService.findByUsername(username, trackingId);
      if (user) {
        this.logger.log(`Usuario encontrado: ${user.email}`, UsersController.name, 'findByUsername', trackingId);
        const { password, ...result } = user.toObject();
        return result;
      }
      return null;
    } catch (error) {
      this.logger.error(`Error al buscar usuario por username: ${error.message}`, error.stack, UsersController.name, 'findByUsername', trackingId);
      throw error;
    }
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('admin','user')
  @ApiOperation({ summary: 'Obtener el Usuarios por id' })
  @ApiResponse({ status: 200, description: 'obtiene el usuario', type: [User] })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene los permisos necesarios' })
  async findOne(@Param('id') id: string, @Request() req) {
    const trackingId = req['trackingId'];

    this.logger.log(`Buscando usuario con ID: ${id}`, UsersController.name, 'findOne', trackingId);
    try {
      const user = await this.usersService.findOne(id, trackingId);
      this.logger.log(`Usuario encontrado: ${user.email}`, UsersController.name, 'findOne', trackingId);
      return user;
    } catch (error) {
      this.logger.error(`Error al buscar usuario ${id}: ${error.message}`, error.stack, UsersController.name, 'findOne', trackingId);
      throw error;
    }
  }

  @Get('paginated')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Obtener todos los Usuarios paginados' })
  @ApiResponse({ status: 200, description: 'Lista de usuario', type: [User] })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene los permisos necesarios' })
  async findPaginatedByUser(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
    @Request() req
  ) {
    const trackingId = req['trackingId'];

    try {

      this.logger.log(
        `Buscando usuario paginados: página: ${page}, límite: ${limit}, búsqueda: ${search}`,
        UsersController.name,
        'findPaginatedByUser',
        trackingId
      );

      const result = await this.usersService.findPaginatedByUser( page, limit, search, trackingId);
      
      this.logger.log(
        `Se encontraron ${result.data.length} usuarios paginados`,
        UsersController.name,
        'findPaginatedByUser', 
        trackingId
      );
      
      return result;
    } catch (error) {
      this.logger.error(
        `Error al buscar usuarios paginados: ${error.message}`,
        error.stack,
        UsersController.name,
        'findPaginatedByUser', 
        trackingId
      );
      throw new HttpException(
        error.message|| 'Error al buscar usuarios paginados',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('admin',)
  @ApiOperation({ summary: 'Obtener todos los Usuarios' })
  @ApiResponse({ status: 200, description: 'Lista de usuario', type: [User] })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene los permisos necesarios' })
  async findAll(@Request() req) {
    const trackingId = req['trackingId'];

    this.logger.log('Obteniendo lista de usuarios', UsersController.name, 'findAll', trackingId);
    try {
      const users = await this.usersService.findAll( trackingId);
      this.logger.log(`Se encontraron ${users.length} usuarios`, UsersController.name, 'findAll', trackingId);
      return users;
    } catch (error) {
      this.logger.error('Error al obtener usuarios', error.stack, UsersController.name, 'findAll', trackingId);
      throw error;
    }
  }

  @Patch(':id/change-password')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'user')
  async changePassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
    @GetUser() user: User,
    @Request() req
  ): Promise<void> {
    const trackingId = req['trackingId'];
    try {
      this.logger.log(`Inicio de cambio de Contraseña para el usuario ID: ${user})`, UsersController.name, 'changePassword', trackingId);

      if (!user) {
        this.logger.warn("User is undefined", UsersController.name, 'changePassword', trackingId); 
        throw new UnauthorizedException('User not authenticated.'); 
      }

      if (user.id !== id) {
        this.logger.warn(`Intento de cambio de contraseña no autorizado por el usuario (ID: ${user.id}) para el usuario (ID: ${id})`, UsersController.name, 'changePassword', trackingId);
        throw new UnauthorizedException('No tiene permiso para cambiar la contraseña de otro usuario.');
      }

      this.logger.log(`Solicitud de cambio de contraseña recibida para el usuario (ID: ${id})`, UsersController.name, 'changePassword', trackingId);
      await this.usersService.changePassword(id, changePasswordDto, trackingId);
  
    } catch (error) {
      this.logger.error(`Error al cambiar la contraseña: ${error.message}`, error.stack, UsersController.name, 'changePassword', trackingId);
      throw new HttpException(
        error.message|| 'Error al cambiar la contraseña',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );   
    }
  }

    

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('admin', 'user')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req) {
    const trackingId = req['trackingId'];

    try {

      this.logger.log(`Actualizando usuario con ID: ${id}`, UsersController.name, 'update', trackingId);
      try {
        const user = await this.usersService.update(id, updateUserDto, trackingId);
        this.logger.log(`Usuario actualizado exitosamente: ${user.email}`, UsersController.name, 'update', trackingId);
        return user;
      } catch (error) {
        this.logger.error(`Error al actualizar usuario ${id}: ${error.message}`, error.stack, UsersController.name, 'update', trackingId);
        throw error;
      }
    } catch (error) {
      this.logger.error(`Error al actualizar usuario ${id}: ${error.message}`, error.stack, UsersController.name, 'update', trackingId);
      throw new HttpException(
        error.message || 'Error al actualizar usuario',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
    
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('admin')
  async remove(@Param('id') id: string, @Request() req) {
    
    const trackingId = req['trackingId'];

    this.logger.log(`Eliminando usuario con ID: ${id}`, UsersController.name, 'remove', trackingId);
    try {
      await this.usersService.remove(id, trackingId);
      this.logger.log(`Usuario eliminado exitosamente: ${id}`, UsersController.name, 'remove', trackingId);
    } catch (error) {
      this.logger.error(`Error al eliminar usuario ${id}: ${error.message}`, error.stack, UsersController.name, 'remove', trackingId);
      throw new HttpException(
        error.message || 'Error al eliminar usuario',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }



}