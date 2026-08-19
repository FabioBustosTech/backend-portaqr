import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
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
// SPEC-008 H5 (R6): DTOs de paginación tipados para @Query()
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { FavoriteQueryDto } from '../../application/dto/favorite-query.dto';
// SPEC-015: DTO con filtros admin (active/type/userId)
import { AdminQrsQueryDto } from '../../application/dto/admin-qrs-query.dto';
import { UpdateQrUseCase } from '../../application/use-cases/update-qr.usecase';
import { DeleteQrUseCase } from '../../application/use-cases/delete-qr.usecase';
// SPEC-014: desactivación admin
import { DeactivateQrUseCase } from '../../application/use-cases/deactivate-qr.usecase';
import { DeactivateQrDto } from '../../application/dto/deactivate-qr.dto';
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
// SPEC-011 Capa B: rate limiting por idQr del flujo público de QR
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { QrPublicThrottlerGuard } from 'src/common/guards/qr-public-throttler.guard';
import { QR_PUBLIC_THROTTLE, QR_SEO_THROTTLE } from 'src/common/config/throttle.config';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { User } from 'src/modules/users/domain/entities/user.entity';
import { StorageService } from 'src/modules/storage/storage.service';
import { ImageProcessorService } from 'src/modules/storage/image-processor.service';
import { PdfSanitizerService } from 'src/modules/storage/pdf-sanitizer.service';
import { getMaxPdfItemsPerQr } from '../../application/pdf-limits.helper';
// SPEC-022 RF-5: sanitización del título del PDF (patrón SPEC-008 — defensa en profundidad)
import { escapeHtml } from 'src/common/utils/escape-html.util';

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

// SPEC-005 RF-6: MIME types aceptados en el fileFilter (solo application/pdf).
const LIST_PDF_ALLOWED_MIME = ['application/pdf'];

// SPEC-022 RF-5: sanitiza el título del PDF (escape-html, patrón SPEC-008) y
// normaliza vacíos a undefined (el item se crea sin title si viene vacío).
function sanitizePdfTitle(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return escapeHtml(trimmed);
}

// SPEC-005 RF-7: límite de entrada desde PDF_MAX_UPLOAD_SIZE (default 2 MB).
// Se evalúa al definir la clase (decorador) — misma técnica que list-image.
function getListPdfMaxUploadSize(): number {
  const raw = process.env.PDF_MAX_UPLOAD_SIZE;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2 * 1024 * 1024;
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
    private readonly deactivateQrUseCase: DeactivateQrUseCase,
    private readonly traceService: TraceService,
    private readonly storageService: StorageService,
    private readonly imageProcessor: ImageProcessorService,
    private readonly pdfSanitizer: PdfSanitizerService, // SPEC-005: sanitización Ghostscript
  ) {}

  @Post()
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Crear un nuevo QR' })
  @ApiResponse({ status: 201, description: 'QR creado exitosamente', type: QrEntity })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
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

    // Validar que el usuario solo pueda crear QRs para sí mismo a menos que sea admin
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

  @Post('list-pdf')
  @Roles('admin', 'user')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Subida de PDF para item de QR multilink (SPEC-005)',
    schema: {
      type: 'object',
      properties: {
        idQr: { type: 'string', description: 'UUID v4 del QR (typeQr: list)' },
        itemId: { type: 'string', description: 'Identificador único del item dentro de urlList[]' },
        file: { type: 'string', format: 'binary', description: 'PDF (application/pdf, máx PDF_MAX_UPLOAD_SIZE default 2 MB)' },
        title: { type: 'string', description: 'Texto descriptivo del contenido (opcional, máx. 60)' }, // SPEC-022 RF-6
      },
    },
  })
  @ApiOperation({ summary: 'Subir PDF de un item de QR multilink (sanitiza con gs y sube a R2)' })
  @ApiResponse({ status: 200, description: 'PDF subido. Retorna { documentUrl, size, itemId, title }' })
  @ApiResponse({ status: 403, description: 'Prohibido - no es el propietario' })
  @ApiResponse({ status: 400, description: 'El QR no es de tipo list, falta idQr/itemId, o límite excedido' })
  @ApiResponse({ status: 413, description: 'Archivo mayor al límite configurado (PDF_MAX_UPLOAD_SIZE, default 2 MB)' })
  @ApiResponse({ status: 415, description: 'Formato no soportado (solo application/pdf)' })
  @ApiResponse({ status: 422, description: 'El PDF no se pudo procesar (corrupto)' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: getListPdfMaxUploadSize() }, // SPEC-005 RF-7: PDF_MAX_UPLOAD_SIZE (default 2 MB)
      fileFilter: (_req, file, cb) => {
        if (!LIST_PDF_ALLOWED_MIME.includes(file.mimetype)) {
          return cb(
            new UnsupportedMediaTypeException(
              'Formato no soportado. Solo se aceptan archivos PDF',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadListPdf(
    @UploadedFile() file: Express.Multer.File,
    @Body('idQr') idQr: string,
    @Body('itemId') itemId: string,
    @GetUser() user: User,
    @Tracking() tracking: TrackingContext,
    @Body('title') title?: string, // SPEC-022 RF-6/RF-7: título descriptivo del contenido (opcional, al final)
  ): Promise<{ documentUrl: string; size: number; itemId: string; title?: string }> {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'POST /qr/list-pdf', {
      idQr,
      itemId,
      userId: user.id,
      // SPEC-022: no loguear el texto del usuario — solo indicar presencia
      hasTitle: title !== undefined && title.trim() !== '',
    });

    if (!file) throw new BadRequestException('El archivo es requerido (campo "file")');
    if (!idQr) throw new BadRequestException('El campo idQr es requerido');
    if (!itemId) throw new BadRequestException('El campo itemId es requerido');

    // 1. Validar que el QR existe, es del usuario y es tipo 'list' (RF-13 paso 4)
    const qr = await this.getQrUseCase.execute(idQr, tracking);
    if (!qr) throw new NotFoundException('QR no encontrado');
    const isAdmin = user.role === 'admin';
    if (!isAdmin && qr.userId !== user.id) {
      this.traceService.warn(tracking, TraceLayer.CONTROLLER, 'POST /qr/list-pdf - forbidden owner', {
        requester: user.id,
        owner: qr.userId,
      });
      throw new ForbiddenException('No tienes permiso para subir un PDF a este QR');
    }
    if (qr.typeQr !== 'list') {
      this.traceService.warn(tracking, TraceLayer.CONTROLLER, 'POST /qr/list-pdf - wrong type', {
        idQr,
        typeQr: qr.typeQr,
      });
      throw new BadRequestException('Solo los QRs multilink (list) admiten items PDF');
    }

    // 2. Validar tipo del item (RF-13 paso 5) y límite MAX_PDF_ITEMS_PER_QR (RF-5)
    const urlList = qr.data?.urlList ?? [];
    const existingItem = urlList.find((it) => it.itemId === itemId);
    const isReplacement = !!existingItem;
    if (existingItem && existingItem.typeUrl !== 'pdf') {
      // RF-13 paso 5: si el itemId existe pero NO es tipo PDF, rechazar ANTES de
      // sanitizar/subir — evita subir a R2 y luego fallar el PATCH por el validador
      // de exclusividad (objeto R2 huérfano + 400 confuso).
      throw new BadRequestException('El item indicado no es de tipo PDF');
    }
    if (!isReplacement) {
      const pdfCount = urlList.filter((it) => it.typeUrl === 'pdf').length;
      if (pdfCount >= getMaxPdfItemsPerQr()) {
        throw new BadRequestException(
          `Límite excedido: máximo ${getMaxPdfItemsPerQr()} items PDF por QR`,
        );
      }
    }

    // 3. Sanitizar con Ghostscript (RF-8) — 422 si el binario no es procesable
    const { buffer, size } = await this.pdfSanitizer.sanitize(file.buffer);

    // 4. Subir a R2 (RF-11: key qr-multilink-pdf/{idQr}-{itemId}.pdf)
    const { publicUrl } = await this.storageService.uploadPdf({
      idQr: qr.idQr,
      itemId,
      buffer,
    });

    // 5. Actualizar el item en urlList (RF-13 paso 9): reemplazo por itemId o append
    const sanitizedTitle = sanitizePdfTitle(title); // SPEC-022 RF-5
    const updatedUrlList = isReplacement
      ? urlList.map((it) => (it.itemId === itemId
          ? {
              ...it,
              documentUrl: publicUrl,
              // SPEC-022 RF-7: si el body trae título, reemplaza; si no, conserva el existente
              title: sanitizedTitle !== undefined ? sanitizedTitle : it.title,
            }
          : it))
      : [...urlList, {
          itemId,
          typeUrl: 'pdf',
          documentUrl: publicUrl,
          title: sanitizedTitle, // SPEC-022 RF-6: el item se crea con su título (o sin él)
        }];

    await this.updateQrUseCase.execute(
      qr.idQr,
      {
        data: {
          ...qr.data,
          urlList: updatedUrlList,
          typeQr: qr.data.typeQr as QrType,
        },
      } as Partial<CreateQrDto>,
      tracking,
    );

    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'POST /qr/list-pdf - complete', {
      idQr,
      itemId,
      documentUrl: publicUrl,
      size,
      hasTitle: sanitizedTitle !== undefined, // SPEC-022
    });

    return { documentUrl: publicUrl, size, itemId, title: sanitizedTitle };
  }

  @Get('seo-idqr')
  @Public()
  // SPEC-011 Capa B: 10 req/min (sin idQr → clave IP interna) — fuera del guard global 10/min
  @SkipThrottle({ default: true })
  @Throttle(QR_SEO_THROTTLE)
  @UseGuards(QrPublicThrottlerGuard)
  @ApiOperation({ summary: 'Obtener los últimos 500 QRs activos con formato SEO' })
  @ApiResponse({ status: 200, description: 'Lista de los últimos 500 QRs activos con formato SEO', type: [QrSeoDto] })
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
  @ApiOperation({ summary: 'Obtener todos los QRs con búsqueda, paginación y filtros (SPEC-015)' })
  @ApiResponse({ status: 200, description: 'Lista de QRs', type: [QrEntity] })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene los permisos necesarios' })
  @HttpCode(HttpStatus.OK)
  async findAll(
    // SPEC-008 H5 (R6): @Query() tipado con PaginationDto — page/limit validados
    // (IsInt/Min/Max, @Type(() => Number)) en vez de @Query('page') page: number
    // SPEC-015: AdminQrsQueryDto añade active/type/userId (filtros admin)
    @Query() query: AdminQrsQueryDto,
    @Tracking() tracking: TrackingContext,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search ?? '';
    const active = query.active ?? 'all';
    const type = query.type;
    const userId = query.userId;
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /qr', { page, limit, search, active, type, userId });
    return this.getAllQrUseCase.execute(page, limit, search, active, type, userId, tracking);
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
  @ApiOperation({ summary: 'Obtener todos los QR del usuario ordenados por fecha de creación y si son favoritos' })
  @ApiResponse({ status: 200, description: 'QR encontrado', type: QrEntity })
  @ApiResponse({ status: 404, description: 'QR no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene los permisos necesarios' })
  async findUserByFavorites(
    // SPEC-008 H5 (R5/R6): @Query() tipado con FavoriteQueryDto (PaginationDto + userId)
    @Query() query: FavoriteQueryDto,
    @GetUser() user: User,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /qr/user/favorites', {
      userId: user.id,
    });

    // Si el usuario es admin y se proporciona un userId, usar ese userId
    // Si no, usar el id del usuario actual
    const targetUserId = user.role === 'admin' && query.userId ? query.userId : user.id;

    return this.getFavoritesQrsUseCase.execute(
      user.id, // userId (siempre el id del usuario actual)
      query.page ?? 1,
      query.limit ?? 10,
      query.search ?? '',
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

    // Sanitizar urlList: descartar _id de los items (evita CastError al re-persistir
    // subdocumentos que vinieron del GET con _id de Mongo)
    if (Array.isArray(updateQrDto.data?.urlList)) {
      updateQrDto.data.urlList = updateQrDto.data.urlList.map((item) => {
        const { _id: _idOmited, ...rest } = item as { _id?: unknown } & typeof item;
        void _idOmited; // _id se descarta intencionalmente (sanitización)
        return rest;
      });
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

    // SPEC-005 RF-15/RF-16: items PDF eliminados o reemplazados → borrar objeto R2 anterior (mejor esfuerzo)
    if (currentQr.typeQr === 'list' && Array.isArray(updateQrDto.data?.urlList)) {
      const oldUrlList = currentQr.data?.urlList ?? [];
      const newUrlList = updateQrDto.data.urlList;

      // Items PDF que estaban en el urlList anterior y ya no están (eliminados) → borrar R2
      const removedPdfItems = oldUrlList.filter(
        (old) => old.typeUrl === 'pdf' && old.documentUrl &&
          !newUrlList.find((nw) => nw.itemId === old.itemId),
      );
      for (const item of removedPdfItems) {
        if (item.documentUrl) {
          try {
            await this.storageService.deleteObject(item.documentUrl); // mejor esfuerzo (RF-15)
          } catch (error) {
            // Defensa en profundidad: StorageService ya no relanza, pero si algún
            // fallo se escapa el PATCH NO debe abortar (§8.1 — objeto R2 huérfano,
            // lo limpia el lifecycle rule §6.3).
            this.traceService.warn(tracking, TraceLayer.CONTROLLER, 'PATCH /qr/:id - pdf delete failed', {
              qrid,
              itemId: item.itemId,
              oldUrl: item.documentUrl,
              error: (error as Error).message,
            });
          }
          this.traceService.log(tracking, TraceLayer.CONTROLLER, 'PATCH /qr/:id - pdf item removed', {
            qrid,
            itemId: item.itemId,
            oldUrl: item.documentUrl,
          });
        }
      }

      // Items PDF con documentUrl reemplazado para el mismo itemId → borrar el anterior
      for (const newItem of newUrlList) {
        if (newItem.typeUrl === 'pdf' && newItem.documentUrl) {
          const oldItem = oldUrlList.find((old) => old.itemId === newItem.itemId);
          if (oldItem?.documentUrl && oldItem.documentUrl !== newItem.documentUrl) {
            try {
              await this.storageService.deleteObject(oldItem.documentUrl); // mejor esfuerzo (RF-16)
            } catch (error) {
              this.traceService.warn(tracking, TraceLayer.CONTROLLER, 'PATCH /qr/:id - pdf delete failed', {
                qrid,
                itemId: newItem.itemId,
                oldUrl: oldItem.documentUrl,
                error: (error as Error).message,
              });
            }
            this.traceService.log(tracking, TraceLayer.CONTROLLER, 'PATCH /qr/:id - pdf replaced', {
              qrid,
              itemId: newItem.itemId,
              oldUrl: oldItem.documentUrl,
            });
          }
        }
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
    // SPEC-008 H5 (R6): @Query() tipado con PaginationDto
    @Query() query: PaginationDto,
    @GetUser() user: User,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /qr/user/:userId/paginated', {
      userId,
      page: query.page,
      limit: query.limit,
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

    return this.getPaginatedQrsByUserUseCase.execute(
      userId,
      query.page ?? 1,
      query.limit ?? 10,
      query.search ?? '',
      tracking,
    );
  }

  @Get('public/:id')
  @Public()
  // SPEC-011 Capa B: 60 req/min por idQr — fuera del guard global 10/min (lo rompería)
  @SkipThrottle({ default: true })
  @Throttle(QR_PUBLIC_THROTTLE)
  @UseGuards(QrPublicThrottlerGuard)
  @ApiOperation({ summary: 'Obtener URL de redirección de un QR público' })
  @ApiResponse({ status: 200, description: 'URL de redirección', type: PublicRedirectUrlResponse })
  @ApiResponse({ status: 404, description: 'QR no encontrado' })
  async getPublicRedirectUrl(@Param('id') id: string, @Tracking() tracking: TrackingContext) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /qr/public/:id', { id });
    return this.getPublicQrUseCase.execute(id, tracking);
  }

  // SPEC-014: desactivación admin de un QR con motivo obligatorio (solo admin).
  @Post('admin/:id/deactivate')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar un QR como admin (motivo obligatorio)' })
  @ApiResponse({ status: 200, description: 'QR desactivado', type: QrEntity })
  @ApiResponse({ status: 400, description: 'ID inválido o motivo faltante/inválido' })
  @ApiResponse({ status: 404, description: 'QR no encontrado o ya inactivo' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Prohibido - No tiene los permisos necesarios' })
  async deactivate(
    @Param('id') qrid: string,
    @Body() deactivateQrDto: DeactivateQrDto,
    @GetUser() user: User,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'POST /qr/admin/:id/deactivate', {
      qrid,
      reasonLength: deactivateQrDto.reason.length,
    });

    // NOTA: NO se valida ObjectId — el QR se busca por `idQr` (UUID v4),
    // como en findOne/update/delete. El usecase lanza 404 si no existe.

    return this.deactivateQrUseCase.execute(qrid, deactivateQrDto.reason, user.id, tracking);
  }
}
