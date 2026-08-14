// pet-tag.controller.ts
import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import { GeneratePetTagsUseCase } from '../../application/use-cases/generate-pet-tags.usecase';
import { GetReservedPetTagsUseCase } from '../../application/use-cases/get-reserved-pet-tags.usecase';
import { GetPetTagStatusUseCase } from '../../application/use-cases/get-pet-tag-status.usecase';
import { UpdatePetTagUseCase } from '../../application/use-cases/update-pet-tag.usecase';
import { ActivatePetTagUseCase } from '../../application/use-cases/activate-pet-tag.usecase';
import { UploadPetImageUseCase, DeletePetImageUseCase } from '../../application/use-cases/pet-tag-image.usecase';
import { ActivatePetTagDto } from '../../application/dto/activate-pet-tag.dto';
import { QueryReservedTagsDto } from '../../application/dto/query-reserved-tags.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/infrastructure/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { GetUser } from 'src/common/decorators/user.decorator';
import { Tracking } from 'src/common/decorators/tracking.decorator';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { GeneratePetTagsDto } from '../../application/dto/generate-pet-tags.dto';
import { UpdatePetTagDto } from '../../application/dto/update-pet-tag.dto';

// SPEC-016 RF-5: allowlist de MIME para la foto de la mascota (415 si otro formato)
const PET_TAG_ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

// SPEC-016 RF-5: límite de subida desde PET_TAG_MAX_UPLOAD_SIZE (default 5 MB).
// Se evalúa al definir la clase (decorador) — misma técnica que list-image (SPEC-002).
function getPetTagMaxUploadSize(): number {
  const raw = process.env.PET_TAG_MAX_UPLOAD_SIZE;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5 * 1024 * 1024;
}

interface AuthenticatedUser {
  id: string;
  role: string;
}

@Controller('pet-tag')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PetTagController {
  constructor(
    private readonly generatePetTagsUseCase: GeneratePetTagsUseCase,
    private readonly getReservedPetTagsUseCase: GetReservedPetTagsUseCase,
    private readonly getPetTagStatusUseCase: GetPetTagStatusUseCase,
    private readonly updatePetTagUseCase: UpdatePetTagUseCase,
    private readonly activatePetTagUseCase: ActivatePetTagUseCase,
    private readonly uploadPetImageUseCase: UploadPetImageUseCase,
    private readonly deletePetImageUseCase: DeletePetImageUseCase,
    private readonly traceService: TraceService,
  ) {}

  // --- RUTA DE ADMINISTRACIÓN ---
  @Post('admin/generate')
  @Roles('admin')
  @ApiOperation({ summary: 'Generar un lote de placas de mascota' })
  @ApiResponse({ status: 200, description: 'Lote de placas generadas exitosamente', type: [GeneratePetTagsDto] })
  @ApiResponse({ status: 400, description: 'Error en la solicitud' })
  @HttpCode(HttpStatus.OK)
  async generatePetTags(
    @Body() generateDto: GeneratePetTagsDto,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'POST /pet-tag/admin/generate', {
      quantity: generateDto.quantity,
    });
    return this.generatePetTagsUseCase.execute(
      generateDto.quantity,
      generateDto.assignedStoreName || '',
      tracking,
    );
  }

  // --- NUEVA RUTA DE ADMINISTRACIÓN PARA CONSULTAR ---
  @Get('admin/reserved')
  @Roles('admin')
  @ApiOperation({ summary: 'Consultar placas reservadas' })
  @ApiResponse({ status: 200, description: 'Placas reservadas obtenidas exitosamente', type: [GeneratePetTagsDto] })
  @ApiResponse({ status: 400, description: 'Error en la solicitud' })
  @HttpCode(HttpStatus.OK)
  async getReservedPetTags(
    @Query() queryDto: QueryReservedTagsDto,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /pet-tag/admin/reserved', {
      queryDto,
    });
    return this.getReservedPetTagsUseCase.execute(queryDto, tracking);
  }

  // --- RUTA PÚBLICA ---
  @Get('public/status/:idQr')
  @Public()
  @ApiOperation({ summary: 'Consultar estado de una placa de mascota' })
  @ApiResponse({ status: 200, description: 'Estado de la placa obtenido exitosamente', type: GeneratePetTagsDto })
  @ApiResponse({ status: 400, description: 'Error en la solicitud' })
  @HttpCode(HttpStatus.OK)
  async getPetTagStatus(@Param('idQr') idQr: string, @Tracking() tracking: TrackingContext) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /pet-tag/public/status/:idQr', {
      idQr,
    });
    return this.getPetTagStatusUseCase.execute(idQr, tracking);
  }

  // --- RUTA PARA ACTUALIZAR POR ID ---
  @Patch('update/:petTagId')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Actualizar datos de una placa de mascota' })
  @ApiResponse({ status: 200, description: 'Datos de la placa actualizados exitosamente', type: GeneratePetTagsDto })
  @ApiResponse({ status: 400, description: 'Error en la solicitud' })
  @HttpCode(HttpStatus.OK)
  async updatePetTag(
    @Param('petTagId') petTagId: string,
    @Body() updateDto: UpdatePetTagDto,
    @GetUser() user: AuthenticatedUser,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'PATCH /pet-tag/update/:petTagId', {
      petTagId,
      userId: user.id,
    });
    return this.updatePetTagUseCase.execute(petTagId, user.id, updateDto, tracking);
  }

  // --- RUTA PROTEGIDA PARA USUARIOS LOGUEADOS ---
  @Patch('activate')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Activar una placa de mascota' })
  @ApiResponse({ status: 200, description: 'Placa activada exitosamente', type: GeneratePetTagsDto })
  @ApiResponse({ status: 400, description: 'Error en la solicitud' })
  @HttpCode(HttpStatus.OK)
  async activatePetTag(
    @Body() activateDto: ActivatePetTagDto,
    @GetUser() user: AuthenticatedUser,
    @Tracking() tracking: TrackingContext,
  ) {
    const userId = user.id;
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'PATCH /pet-tag/activate', {
      idQr: activateDto.idQr,
      userId,
    });
    return this.activatePetTagUseCase.execute(
      activateDto.idQr,
      activateDto.activationPin,
      activateDto.petData,
      userId,
      tracking,
    );
  }

  // --- RUTA PARA ACTUALIZAR POR QR ID ---
  @Patch(':idQr')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Actualizar la información de una PetTag' })
  @ApiResponse({ status: 200, description: 'Placa actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Placa no encontrada o no pertenece al usuario' })
  @HttpCode(HttpStatus.OK)
  async updatePetTagByQrId(
    @Param('idQr') idQr: string,
    @Body() updateDto: UpdatePetTagDto,
    @GetUser() user: AuthenticatedUser,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'PATCH /pet-tag/:idQr', {
      idQr,
      userId: user.id,
    });
    return this.updatePetTagUseCase.execute(idQr, user.id, updateDto, tracking);
  }

  // --- SPEC-016: SUBIR / REEMPLAZAR FOTO DE LA MASCOTA ---
  @Post(':idQr/image')
  @Roles('admin', 'user')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Subida de foto de la mascota para PetTag (SPEC-016)',
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Imagen (jpeg/png/webp, ≤5 MB)' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Foto subida y persistida en petData.petImageUrl' })
  @ApiResponse({ status: 400, description: 'El archivo es requerido' })
  @ApiResponse({ status: 403, description: 'No eres el dueño de la placa' })
  @ApiResponse({ status: 404, description: 'Placa no encontrada' })
  @ApiResponse({ status: 413, description: 'Archivo mayor a 5 MB' })
  @ApiResponse({ status: 415, description: 'Formato no soportado (solo jpeg/png/webp)' })
  @ApiResponse({ status: 422, description: 'La imagen no se pudo procesar (corrupta)' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: getPetTagMaxUploadSize() }, // RF-5: PET_TAG_MAX_UPLOAD_SIZE (default 5 MB)
      fileFilter: (_req, file, cb) => {
        if (!PET_TAG_ALLOWED_MIME.includes(file.mimetype)) {
          return cb(
            new UnsupportedMediaTypeException(
              'Formato no soportado: solo se permiten imágenes JPEG, PNG o WebP',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadPetTagImage(
    @Param('idQr') idQr: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @GetUser() user: AuthenticatedUser,
    @Tracking() tracking: TrackingContext,
  ): Promise<{ petImageUrl: string; size: number; width: number; height: number }> {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'POST /pet-tag/:idQr/image', {
      idQr,
      userId: user.id,
    });

    if (!file) {
      throw new BadRequestException('El archivo es requerido (campo "file")');
    }

    return this.uploadPetImageUseCase.execute(idQr, user.id, user.role, file.buffer, tracking);
  }

  // --- SPEC-016: ELIMINAR FOTO DE LA MASCOTA ---
  @Delete(':idQr/image')
  @Roles('admin', 'user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar la foto de la mascota de una PetTag' })
  @ApiResponse({ status: 200, description: 'Foto eliminada (petImageUrl null y objeto R2 borrado)' })
  @ApiResponse({ status: 403, description: 'No eres el dueño de la placa' })
  @ApiResponse({ status: 404, description: 'Placa no encontrada' })
  async deletePetTagImage(
    @Param('idQr') idQr: string,
    @GetUser() user: AuthenticatedUser,
    @Tracking() tracking: TrackingContext,
  ): Promise<{ petImageUrl: null }> {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'DELETE /pet-tag/:idQr/image', {
      idQr,
      userId: user.id,
    });
    return this.deletePetImageUseCase.execute(idQr, user.id, user.role, tracking);
  }
}
