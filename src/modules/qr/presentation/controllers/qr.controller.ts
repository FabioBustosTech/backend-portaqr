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
  ForbiddenException,
  Query,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateQrUseCase } from '../../application/use-cases/create-qr.usecase';
import { GetAllQrUseCase } from '../../application/use-cases/get-all-qr.usecase';
import { GetQrUseCase } from '../../application/use-cases/get-qr.usecase';
import { GetQrsByUserUseCase } from '../../application/use-cases/get-qrs-by-user.usecase';
import { GetPaginatedQrsByUserUseCase } from '../../application/use-cases/get-paginated-qrs-by-user.usecase';
import { GetFavoritesQrsUseCase } from '../../application/use-cases/get-favorites-qrs.usecase';
import { GetRecentActiveQrUseCase } from '../../application/use-cases/get-recent-active-qr.usecase';
import { GetPublicQrUseCase } from '../../application/use-cases/get-public-qr.usecase';
import { UpdateQrUseCase } from '../../application/use-cases/update-qr.usecase';
import { DeleteQrUseCase } from '../../application/use-cases/delete-qr.usecase';
import { CreateQrDto } from '../../application/dto/create-qr.dto';
import { QrEntity } from '../../domain/entities/qr.entity';
import { QrSeoDto } from '../../application/dto/qr-seo.dto';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/infrastructure/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { GetUser } from 'src/common/decorators/user.decorator';
import { Tracking } from 'src/common/decorators/tracking.decorator';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
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
  constructor(
    private readonly createQrUseCase: CreateQrUseCase,
    private readonly getAllQrUseCase: GetAllQrUseCase,
    private readonly getQrUseCase: GetQrUseCase,
    private readonly getQrsByUserUseCase: GetQrsByUserUseCase,
    private readonly getPaginatedQrsByUserUseCase: GetPaginatedQrsByUserUseCase,
    private readonly getFavoritesQrsUseCase: GetFavoritesQrsUseCase,
    private readonly getRecentActiveQrUseCase: GetRecentActiveQrUseCase,
    private readonly getPublicQrUseCase: GetPublicQrUseCase,
    private readonly updateQrUseCase: UpdateQrUseCase,
    private readonly deleteQrUseCase: DeleteQrUseCase,
    private readonly traceService: TraceService,
  ) {}

  @Post()
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Crear un nuevo QR' })
  @ApiResponse({ status: 201, description: 'QR creado exitosamente', type: QrEntity })
  @ApiResponse({ status: 400, description: 'Datos invÃ¡lidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene los permisos necesarios' })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createQrDto: CreateQrDto,
    @GetUser() user: User,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'POST /qr', {
      userId: createQrDto.userId,
      idQr: createQrDto.idQr,
    });

    // Validar que el usuario solo pueda crear QRs para sÃ­ mismo a menos que sea admin
    const isAdmin = user.role === 'admin';
    if (!isAdmin && createQrDto.userId !== user.id) {
      this.traceService.warn(tracking, TraceLayer.CONTROLLER, 'POST /qr - forbidden owner', {
        requester: user.id,
        target: createQrDto.userId,
      });
      throw new ForbiddenException('Solo puedes crear QRs para tu propio usuario');
    }

    return this.createQrUseCase.execute(createQrDto, tracking);
  }

  @Get('seo-idqr')
  @Public()
  @ApiOperation({ summary: 'Obtener los Ãºltimos 500 QRs activos con formato SEO' })
  @ApiResponse({ status: 200, description: 'Lista de los Ãºltimos 500 QRs activos con formato SEO', type: [QrSeoDto] })
  @ApiResponse({ status: 400, description: 'Error en la solicitud' })
  @HttpCode(HttpStatus.OK)
  async getSeoQrs(@Tracking() tracking: TrackingContext) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /qr/seo-idqr');

    const qrRecords = await this.getRecentActiveQrUseCase.execute(500, tracking);

    // Transformar los registros a formato SEO
    const seoQrs = qrRecords.map((qr) => ({
      id: qr.idQr,
      updatedAt: qr.updatedAt,
    }));

    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /qr/seo-idqr - complete', {
      total: seoQrs.length,
    });
    return seoQrs;
  }

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Obtener todos los QRs con bÃºsqueda y paginaciÃ³n' })
  @ApiResponse({ status: 200, description: 'Lista de QRs', type: [QrEntity] })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene los permisos necesarios' })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /qr', { page, limit, search });
    return this.getAllQrUseCase.execute(page, limit, search, tracking);
  }

  @Get(':id')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Obtener un QR por ID' })
  @ApiResponse({ status: 200, description: 'QR encontrado', type: QrEntity })
  @ApiResponse({ status: 404, description: 'QR no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene los permisos necesarios' })
  async findOne(
    @Param('id') id: string,
    @GetUser() user: User,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /qr/:id', { id });

    const qr = await this.getQrUseCase.execute(id, tracking);

    // Validar que el usuario solo pueda ver sus propios QRs a menos que sea admin
    const isAdmin = user.role === 'admin';
    if (!isAdmin && qr.userId !== user.id) {
      this.traceService.warn(tracking, TraceLayer.CONTROLLER, 'GET /qr/:id - forbidden owner', {
        requester: user.id,
        owner: qr.userId,
      });
      throw new ForbiddenException('No tienes permiso para ver este QR');
    }
    return qr;
  }

  @Get('user/favorites')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Obtener todos los QR del usuario ordenados por fecha de creaciÃ³n y si son favoritos' })
  @ApiResponse({ status: 200, description: 'QR encontrado', type: QrEntity })
  @ApiResponse({ status: 404, description: 'QR no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene los permisos necesarios' })
  async findUserByFavorites(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
    @Query('userId') userId: string = '',
    @GetUser() user: User,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /qr/user/favorites', {
      userId: user.id,
    });

    // Si el usuario es admin y se proporciona un userId, usar ese userId
    // Si no, usar el id del usuario actual
    const targetUserId = user.role === 'admin' && userId ? userId : user.id;

    return this.getFavoritesQrsUseCase.execute(
      user.id, // userId (siempre el id del usuario actual)
      page,
      limit,
      search,
      user.role,
      targetUserId, // userId2 (el id del usuario a buscar)
      tracking,
    );
  }

  @Get('user/:userId')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Obtener QRs por ID de usuario' })
  @ApiResponse({ status: 200, description: 'Lista de QRs del usuario', type: [QrEntity] })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene los permisos necesarios' })
  async findByUserId(
    @Param('userId') userId: string,
    @GetUser() user: User,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /qr/user/:userId', { userId });

    // Validar que el usuario solo pueda ver sus propios QRs a menos que sea admin
    const isAdmin = user.role === 'admin';
    if (!isAdmin && userId !== user.id) {
      this.traceService.warn(tracking, TraceLayer.CONTROLLER, 'GET /qr/user/:userId - forbidden', {
        requester: user.id,
        target: userId,
      });
      throw new ForbiddenException('Solo puedes ver tus propios QRs');
    }

    return this.getQrsByUserUseCase.execute(userId, tracking);
  }

  @Patch(':id')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Actualizar un QR' })
  @ApiResponse({ status: 200, description: 'QR actualizado', type: QrEntity })
  @ApiResponse({ status: 404, description: 'QR no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene los permisos necesarios' })
  async update(
    @Param('id') qrid: string,
    @Body() updateQrDto: Partial<CreateQrDto>,
    @GetUser() user: User,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'PATCH /qr/:id', { qrid });

    // Obtener el QR actual (lanza 404 si no existe)
    const currentQr = await this.getQrUseCase.execute(qrid, tracking);

    // Verificar si el usuario es admin o propietario
    const isAdmin = user.role === 'admin';
    const isOwner = currentQr.userId === user.id;

    if (!isAdmin && !isOwner) {
      this.traceService.warn(tracking, TraceLayer.CONTROLLER, 'PATCH /qr/:id - forbidden', {
        requester: user.id,
        owner: currentQr.userId,
      });
      throw new ForbiddenException('No tienes permiso para actualizar este QR');
    }

    // Validar que no se pueda cambiar el userId a menos que sea admin
    if (updateQrDto.userId && !isAdmin) {
      if (updateQrDto.userId !== user.id) {
        this.traceService.warn(tracking, TraceLayer.CONTROLLER, 'PATCH /qr/:id - forbidden owner change', {
          requester: user.id,
          target: updateQrDto.userId,
        });
        throw new ForbiddenException('No puedes cambiar el propietario del QR');
      }
    }

    return this.updateQrUseCase.execute(qrid, updateQrDto, tracking);
  }

  @Delete(':id')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Eliminar un QR' })
  @ApiResponse({ status: 200, description: 'QR eliminado' })
  @ApiResponse({ status: 404, description: 'QR no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene los permisos necesarios' })
  async remove(
    @Param('id') qrid: string,
    @GetUser() user: User,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'DELETE /qr/:id', { qrid });

    // Obtener el QR actual (lanza 404 si no existe)
    const currentQr = await this.getQrUseCase.execute(qrid, tracking);

    // Verificar si el usuario es admin o propietario
    const isAdmin = user.role === 'admin';
    const isOwner = currentQr.userId === user.id;
    if (!isAdmin && !isOwner) {
      this.traceService.warn(tracking, TraceLayer.CONTROLLER, 'DELETE /qr/:id - forbidden', {
        requester: user.id,
        owner: currentQr.userId,
      });
      throw new ForbiddenException('No tienes permiso para eliminar este QR');
    }

    await this.deleteQrUseCase.execute(qrid, tracking);
    return { message: 'QR eliminado exitosamente' };
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
    @GetUser() user: User,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /qr/user/:userId/paginated', {
      userId,
      page,
      limit,
    });

    // Validar que el usuario solo pueda ver sus propios QRs a menos que sea admin
    const isAdmin = user.role === 'admin';
    if (!isAdmin && userId !== user.id) {
      this.traceService.warn(tracking, TraceLayer.CONTROLLER, 'GET /qr/user/:userId/paginated - forbidden', {
        requester: user.id,
        target: userId,
      });
      throw new ForbiddenException('Solo puedes ver tus propios QRs');
    }

    return this.getPaginatedQrsByUserUseCase.execute(userId, page, limit, search, tracking);
  }

  @Get('public/:id')
  @Public()
  @ApiOperation({ summary: 'Obtener URL de redirecciÃ³n de un QR pÃºblico' })
  @ApiResponse({ status: 200, description: 'URL de redirecciÃ³n', type: PublicRedirectUrlResponse })
  @ApiResponse({ status: 404, description: 'QR no encontrado' })
  async getPublicRedirectUrl(@Param('id') id: string, @Tracking() tracking: TrackingContext) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /qr/public/:id', { id });
    return this.getPublicQrUseCase.execute(id, tracking);
  }
}
