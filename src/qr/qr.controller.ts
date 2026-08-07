import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  HttpException,
  UseGuards,
  Request,
  ForbiddenException,
  Query,
  HttpCode,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { QrService } from './qr.service';
import { CreateQrDto } from './dto/create-qr.dto';
import { Qr } from './entities/qr.entity';
import { QrSeoDto } from './dto/qr-seo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CustomLogger } from 'src/shared/utils/logger.util';
import { Public } from '../auth/decorators/public.decorator';
import { GetUser } from 'src/auth/decorators/user.decorator';
import { User } from 'src/users/interfaces/usuario.type';

class PublicRedirectUrlResponse {
  data: string;
  id: string;
  name: string;
  description: string;
}

@ApiTags('QR')
@Controller('qr')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class QrController {
  private readonly logger = new CustomLogger(QrController.name);

  constructor(private readonly qrService: QrService) {}

  @Post()
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Crear un nuevo QR' })
  @ApiResponse({ status: 201, description: 'QR creado exitosamente', type: Qr })
  @ApiResponse({ status: 400, description: 'Datos invÃ¡lidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene los permisos necesarios' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createQrDto: CreateQrDto, @Request() req) {
    const trackingId = req['trackingId'];
    try {
      // Validar que el usuario solo pueda crear QRs para sÃ­ mismo a menos que sea admin
      const isAdmin = req.user.role === 'admin';
      if (!isAdmin && createQrDto.userId !== req.user.id) {
        this.logger.warn(
          `Usuario ${req.user.id} intentÃ³ crear un QR para otro usuario: ${createQrDto.userId}`,
          QrController.name,
           'create',
            trackingId
        );
        throw new ForbiddenException('Solo puedes crear QRs para tu propio usuario');
      }

      this.logger.log(
        `Creando nuevo QR para usuario: ${createQrDto.userId}`,
        QrController.name,
        'create',
        trackingId
      );
      const qr = await this.qrService.create(createQrDto, trackingId);
      this.logger.log(
        `QR creado exitosamente con ID: ${qr.idQr}`,
        QrController.name,
        'create',
        trackingId
      );
      return qr;
    } catch (error) {
      this.logger.error(
        `Error al crear QR: ${error.message}`,
        error.stack,
        QrController.name,
        'create',
        trackingId
      );
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Get('seo-idqr')
  @Public()
  @ApiOperation({ summary: 'Obtener los Ãºltimos 500 QRs activos con formato SEO' })
  @ApiResponse({ status: 200, description: 'Lista de los Ãºltimos 500 QRs activos con formato SEO', type: [QrSeoDto] })
  @ApiResponse({ status: 400, description: 'Error en la solicitud' })
  @HttpCode(HttpStatus.OK)
  async getSeoQrs(@Request() req) {
    const trackingId = req['trackingId'];
    try {
      this.logger.log('Buscando los Ãºltimos 500 QRs activos para SEO', QrController.name, 'getSeoQrs', trackingId);
      const qrRecords = await this.qrService.getRecentActive(500);
      
      // Transformar los registros a formato SEO
      const seoQrs = qrRecords.map(qr => ({
        id: qr.idQr,
        updatedAt: qr.updatedAt
      }));

      this.logger.log(`Encontrados ${qrRecords.length} QRs activos para SEO`, QrController.name, 'getSeoQrs', trackingId);
      return seoQrs;
    } catch (error) {
      this.logger.error(
        `Error al obtener QRs SEO: ${error.message}`,
        error.stack,
        QrController.name,
        'getSeoQrs',
        trackingId
      );
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Obtener todos los QRs con bÃºsqueda y paginaciÃ³n' })
  @ApiResponse({ status: 200, description: 'Lista de QRs', type: [Qr] })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene los permisos necesarios' })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
    @Request() req
  ) {
    const trackingId = req['trackingId'];
    try {
      this.logger.log(
        `Obteniendo lista de todos los QRs - PÃ¡gina: ${page}, LÃ­mite: ${limit}, BÃºsqueda: ${search}`,
        QrController.name,
        'findAll',
        trackingId
      );
      const result = await this.qrService.findAllWithSearch(page, limit, search, trackingId);
      
      this.logger.log(
        `Se encontraron ${result.data.length} QRs en total ${result.pagination.total}`,
        QrController.name,
        'findAll',
        trackingId
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error al obtener QRs: ${error.message}`,
        error.stack,
        QrController.name,
        'findAll',
        trackingId
      );
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Obtener un QR por ID' })
  @ApiResponse({ status: 200, description: 'QR encontrado', type: Qr })
  @ApiResponse({ status: 404, description: 'QR no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene los permisos necesarios' })
  async findOne(@Param('id') id: string, @Request() req) {
    const trackingId = req['trackingId'];
    try {
      this.logger.log(
        `Buscando QR con ID: ${id}`,
        QrController.name,
        'findOne',
        trackingId
      );
      const qr = await this.qrService.findOne(id, trackingId);
      if (!qr) {
        this.logger.warn(`QR  no encontrado con ID: ${id}`,QrController.name, 'findOne',trackingId);
        throw new NotFoundException(`QR con ID ${id} no encontrado`);
      }

      // Validar que el usuario solo pueda ver sus propios QRs a menos que sea admin
      const isAdmin = req.user.role === 'admin';
      if (!isAdmin && qr.userId !== req.user.id) {
        this.logger.warn(`Usuario ${req.user.id} intentÃ³ ver un QR que no le pertenece: ${id}`,QrController.name, 'findOne',trackingId);
        throw new ForbiddenException('No tienes permiso para ver este QR');
      }  
     return qr;
    } catch (error) {
      this.logger.error(
        `Error al buscar QR: ${error.message}`,
        error.stack,
        QrController.name,
        'findOne',
        trackingId
      );
      throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('user/favorites')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Obtener todos los QR del usuario ordenados por fecha de creaciÃ³n y si son favoritos' })
  @ApiResponse({ status: 200, description: 'QR encontrado', type: Qr })
  @ApiResponse({ status: 404, description: 'QR no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene los permisos necesarios' })
  async findUserByFavorites(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
    @Query('userId') userId: string = '',
    @GetUser() user: User,
    @Request() req
  ) {
    const trackingId = req['trackingId'];
    try {
      this.logger.log(
        `Buscando QRs del usuario: ${user.id}, userId: ${userId}`,
        QrController.name,
        'findUserByFavorites',
        trackingId
      );
      
      // Si el usuario es admin y se proporciona un userId, usar ese userId
      // Si no, usar el id del usuario actual
      const targetUserId = user.role === 'admin' && userId ? userId : user.id;
      
      const result = await this.qrService.findUserByFavorites(
        user.id,  // userId (siempre el id del usuario actual)
        page,
        limit,
        search,
        user.role,
        targetUserId,  // userId2 (el id del usuario a buscar)
        trackingId
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error al buscar QRs favoritos: ${error.message}`,
        error.stack,
        QrController.name,
        'findUserByFavorites',
        trackingId
      );
      throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  
  @Get('user/:userId')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Obtener QRs por ID de usuario' })
  @ApiResponse({ status: 200, description: 'Lista de QRs del usuario', type: [Qr] })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene los permisos necesarios' })
  async findByUserId(@Param('userId') userId: string, @Request() req) {
    const trackingId = req['trackingId'];
    try {
      // Validar que el usuario solo pueda ver sus propios QRs a menos que sea admin
      const isAdmin = req.user.role === 'admin';
      if (!isAdmin && userId !== req.user.id) {
        this.logger.warn(`Usuario ${req.user.id} intentÃ³ ver QRs de otro usuario: ${userId}`,QrController.name, 'findByUserId', trackingId);
        throw new ForbiddenException('Solo puedes ver tus propios QRs');
      }

      this.logger.log(`Buscando QRs del usuario: ${userId}`, QrController.name, 'findByUserId', trackingId);
      const qrs = await this.qrService.findByUserId(userId,trackingId);
      this.logger.log(`Se encontraron ${qrs.length} QRs para el usuario ${userId}`, QrController.name, 'findByUserId', trackingId);
      return qrs;
    } catch (error) {
      this.logger.error(`Error al buscar QRs del usuario: ${error.message}`, QrController.name, 'findByUserId', trackingId);
      throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch(':id')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Actualizar un QR' })
  @ApiResponse({ status: 200, description: 'QR actualizado', type: Qr })
  @ApiResponse({ status: 404, description: 'QR no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene los permisos necesarios' })
  async update(
    @Param('id') qrid: string,
    @Body() updateQrDto: Partial<CreateQrDto>,
    @Request() req
  ) {
    const trackingId = req['trackingId'];
    try {
      this.logger.log(
        `Actualizando QR con ID: ${qrid}`,
        QrController.name,
        'update',
        trackingId
      );
      
      // Obtener el QR actual
      const currentQr = await this.qrService.findOne(qrid, trackingId);
      if (!currentQr) {
        this.logger.warn(`QR no encontrado con ID: ${qrid}`,QrController.name, 'update', trackingId);
        throw new HttpException('QR no encontrado', HttpStatus.NOT_FOUND);
      }

      // Verificar si el usuario es admin o propietario
      const isAdmin = req.user.role === 'admin';
      const isOwner = currentQr.userId === req.user.id;

      if (!isAdmin && !isOwner) {
        this.logger.warn(`Usuario ${req.user.id} intentÃ³ actualizar un QR que no le pertenece`,QrController.name, 'update', trackingId);
        throw new ForbiddenException('No tienes permiso para actualizar este QR');
      }

      // Validar que no se pueda cambiar el userId a menos que sea admin
      if (updateQrDto.userId && !isAdmin) {
        if (updateQrDto.userId !== req.user.id) {
          this.logger.warn(`El usuario ${req.user.id} no tiene permiso para cambiar el propietario del QR ${qrid} `,QrController.name, 'update', trackingId);
          throw new ForbiddenException('No puedes cambiar el propietario del QR');
        }
      }

      const qr = await this.qrService.update(qrid, updateQrDto, trackingId);
      this.logger.log(
        `QR actualizado exitosamente: ${qrid}`,
        QrController.name,
        'update',
        trackingId
      );
      return qr;
    } catch (error) {
      this.logger.error(
        `Error al actualizar QR: ${error.message}`,
        error.stack,
        QrController.name,
        'update',
        trackingId
      );
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':id')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Eliminar un QR' })
  @ApiResponse({ status: 200, description: 'QR eliminado' })
  @ApiResponse({ status: 404, description: 'QR no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene los permisos necesarios' })
  async remove(@Param('id') qrid: string, @Request() req) {
    const trackingId = req['trackingId'];
    try {
      this.logger.log(
        `Eliminando QR con ID: ${qrid}`,
        QrController.name,
        'remove',
        trackingId
      );

       // Obtener el QR actual
       const currentQr = await this.qrService.findOne(qrid, trackingId);
       if (!currentQr) {
         this.logger.warn(`QR no encontrado con ID: ${qrid}`,QrController.name, 'update',trackingId);
         throw new HttpException('QR no encontrado', HttpStatus.NOT_FOUND);
       }
        // Verificar si el usuario es admin o propietario
      const isAdmin = req.user.role === 'admin';
      const isOwner = currentQr.userId === req.user.id;
      if (!isAdmin && !isOwner) {
        this.logger.warn(`Usuario ${req.user.id} intentÃ³ eliminar un QR que no le pertenece`,QrController.name, 'remove',trackingId);
        throw new ForbiddenException('No tienes permiso para eliminar este QR');
      }
      const result = await this.qrService.remove(qrid, trackingId);
      if (!result) {
        throw new HttpException('QR no encontrado', HttpStatus.NOT_FOUND);
      }
      this.logger.log(
        `QR eliminado exitosamente: ${qrid}`,
        QrController.name,
        'remove',
        trackingId
      );
      return { message: 'QR eliminado exitosamente' };
    } catch (error) {
      this.logger.error(
        `Error al eliminar QR: ${error.message}`,
        error.stack,
        QrController.name,
        'remove',
        trackingId
      );
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('user/:userId/paginated')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Obtener QRs paginados por ID de usuario' })
  @ApiResponse({ status: 200, description: 'Lista paginada de QRs del usuario' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene los permisos necesarios' })
  async findPaginatedByUser(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
    @Request() req
  ) {
    const trackingId = req['trackingId'];
    try {
      // Validar que el usuario solo pueda ver sus propios QRs a menos que sea admin
      const isAdmin = req.user.role === 'admin';
      if (!isAdmin && userId !== req.user.id) {
        this.logger.warn(
          `Usuario ${req.user.id} intentÃ³ ver QRs paginados de otro usuario: ${userId}`,
          QrController.name,
          'findPaginatedByUser',
          trackingId
        );
        throw new ForbiddenException('Solo puedes ver tus propios QRs');
      }

      this.logger.log(
        `Buscando QRs paginados del usuario: ${userId} - PÃ¡gina: ${page}, LÃ­mite: ${limit}, BÃºsqueda: ${search}`,
        QrController.name,
        'findPaginatedByUser',
        trackingId
      );
      
      const result = await this.qrService.findPaginatedByUser(userId, page, limit, search, trackingId);
      
      this.logger.log(
        `Se encontraron ${result.data.length} QRs para el usuario ${userId}`,
        QrController.name,
        'findPaginatedByUser',
        trackingId
      );
      
      return result;
    } catch (error) {
      this.logger.error(
        `Error al buscar QRs paginados del usuario: ${error.message}`,
        error.stack,
        QrController.name,
        'findPaginatedByUser',
        trackingId
      );
      throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('public/:id')
  @Public()
  @ApiOperation({ summary: 'Obtener URL de redirecciÃ³n de un QR pÃºblico' })
  @ApiResponse({ status: 200, description: 'URL de redirecciÃ³n', type: PublicRedirectUrlResponse })
  @ApiResponse({ status: 404, description: 'QR no encontrado' })
  async getPublicRedirectUrl(@Param('id') id: string, @Request() req) {
    const trackingId = req['trackingId'] || 'PUBLIC_ACCESS';
    try {
      this.logger.log(
        `Obteniendo URL de redirecciÃ³n pÃºblica para QR ID: ${id}`,
        QrController.name,
        'getPublicRedirectUrl',
        trackingId
      );
      const qr = await this.qrService.findOne(id, trackingId);
      if (!qr) {
        this.logger.warn(`QR no encontrado con ID: ${id}`,QrController.name, 'getPublicRedirectUrl',trackingId);
        throw new NotFoundException(`QR con ID ${id} no encontrado`);
      }

      if (!qr.active) {
        this.logger.warn(`QR inactivo con ID: ${id}`,QrController.name, 'getPublicRedirectUrl',trackingId);
        throw new HttpException('QR inactivo', HttpStatus.NOT_FOUND);
      }

      this.logger.log(
        `URL de redirecciÃ³n obtenida exitosamente para QR: ${id}`,
        QrController.name,
         'getPublicRedirectUrl',
        trackingId  
      );

      return {
        data: qr.data,
        name: qr.name || '',
        id: qr.userId,
        description: qr.description || '',
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener URL de redirecciÃ³n: ${error.message}`,
        error.stack,
        QrController.name,
        'getPublicRedirectUrl',
        trackingId
      );
      throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }


}
