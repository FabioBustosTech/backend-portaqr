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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { memoryStorage } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
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
import { CreateQrDto, QrType } from '../../application/dto/create-qr.dto';
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
import type { User } from 'src/modules/users/domain/entities/user.entity';
import { StorageService } from 'src/modules/storage/storage.service';
import { ImageProcessorService } from 'src/modules/storage/image-processor.service';

// SPEC-002: MIME types aceptados en el fileFilter (RF-5). La salida siempre es WebP.
const LIST_IMAGE_ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/bmp',
  'image/heic',
  'image/heif',
];

// RF-6: límite de entrada desde CLOUDFLARE_R2_MAX_UPLOAD_SIZE (default 5 MB).
// Se evalúa al definir la clase (decorador), por lo que lee process.env directo:
// en docker-compose (env_file) y Railway la variable está en el proceso desde el arranque.
function getListImageMaxUploadSize(): number {
  const raw = process.env.CLOUDFLARE_R2_MAX_UPLOAD_SIZE;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5 * 1024 * 1024;
}

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
    private readonly storageService: StorageService,
    private readonly imageProcessor: ImageProcessorService,
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

  @Post('list-image')
  @Roles('admin', 'user')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Subida de imagen de portada para QR multilink (SPEC-002)',
    schema: {
      type: 'object',
      properties: {
        idQr: { type: 'string', description: 'UUID v4 del QR (typeQr: list)' },
        file: { type: 'string', format: 'binary', description: 'Imagen (JPG, PNG, WebP, AVIF, GIF, BMP, HEIC)' },
      },
    },
  })
  @ApiOperation({ summary: 'Subir imagen de portada de un QR multilink (procesa con sharp y sube a R2)' })
  @ApiResponse({ status: 200, description: 'Imagen subida. Retorna { listImageUrl, size, width, height }' })
  @ApiResponse({ status: 403, description: 'Prohibido - no es el propietario' })
  @ApiResponse({ status: 400, description: 'El QR no es de tipo list o falta idQr/archivo' })
  @ApiResponse({ status: 413, description: 'Archivo mayor a 5 MB' })
  @ApiResponse({ status: 415, description: 'Formato no soportado' })
  @ApiResponse({ status: 422, description: 'La imagen no se pudo procesar (corrupta)' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: getListImageMaxUploadSize() }, // RF-6: CLOUDFLARE_R2_MAX_UPLOAD_SIZE (default 5 MB)
      fileFilter: (_req, file, cb) => {
        if (!LIST_IMAGE_ALLOWED_MIME.includes(file.mimetype)) {
          return cb(
            new UnsupportedMediaTypeException(
              'Formato no soportado. Usa JPG, PNG, WebP, AVIF, GIF, BMP o HEIC',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadListImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('idQr') idQr: string,
    @GetUser() user: User,
    @Tracking() tracking: TrackingContext,
  ): Promise<{ listImageUrl: string; size: number; width: number; height: number }> {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'POST /qr/list-image', { idQr, userId: user.id });

    if (!file) throw new BadRequestException('El archivo es requerido (campo "file")');
    if (!idQr) throw new BadRequestException('El campo idQr es requerido');

    // 1. Validar que el QR existe, es del usuario y es tipo 'list' (RF-12 paso 4)
    const qr = await this.getQrUseCase.execute(idQr, tracking);
    if (!qr) throw new NotFoundException('QR no encontrado');
    const isAdmin = user.role === 'admin';
    if (!isAdmin && qr.userId !== user.id) {
      this.traceService.warn(tracking, TraceLayer.CONTROLLER, 'POST /qr/list-image - forbidden owner', {
        requester: user.id,
        owner: qr.userId,
      });
      throw new ForbiddenException('No tienes permiso para subir una imagen a este QR');
    }
    if (qr.typeQr !== 'list') {
      this.traceService.warn(tracking, TraceLayer.CONTROLLER, 'POST /qr/list-image - wrong type', {
        idQr,
        typeQr: qr.typeQr,
      });
      throw new BadRequestException('Solo los QRs multilink (list) admiten imagen de portada');
    }

    // 2. Pipeline sharp (RF-7): resize 512 inside + webp q82 → buffer sanitizado (SIN rotación)
    const { buffer, width, height } = await this.imageProcessor.process(file.buffer);

    // 3. Subir a R2 (mismo key, sobrescribe — RF-11)
    const { publicUrl, size } = await this.storageService.uploadImage({
      idQr: qr.idQr,
      buffer,
      width,
      height,
    });

    // 4. Persistir la URL en MongoDB (RF-12 paso 7)
    await this.updateQrUseCase.execute(
      qr.idQr,
      {
        data: {
          ...qr.data,
          listImageUrl: publicUrl,
          typeQr: qr.data.typeQr as QrType,
        },
      } as Partial<CreateQrDto>,
      tracking,
    );

    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'POST /qr/list-image - complete', {
      idQr,
      listImageUrl: publicUrl,
      size,
      width,
      height,
    });

    return { listImageUrl: publicUrl, size, width, height };
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

    // SPEC-002 RF-4: ignorar listImageUrl si el QR no es de tipo 'list'
    if (currentQr.typeQr !== 'list' && updateQrDto.data?.listImageUrl !== undefined) {
      delete updateQrDto.data.listImageUrl;
    } else if (currentQr.typeQr === 'list') {
      // SPEC-002 RF-14/RF-15: si la imagen cambió o se eliminó, borrar el objeto R2 anterior (mejor esfuerzo)
      const newUrl = updateQrDto.data?.listImageUrl;
      const oldUrl = currentQr.data?.listImageUrl ?? null;
      if (newUrl !== undefined && newUrl !== oldUrl && oldUrl) {
        await this.storageService.deleteObject(oldUrl);
        this.traceService.log(tracking, TraceLayer.CONTROLLER, 'PATCH /qr/:id - list image replaced', {
          qrid,
          oldUrl,
          newUrl: newUrl ?? null,
        });
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
