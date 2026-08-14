import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import type { ICanGetPetTag, ICanUpdatePetTag } from '../../domain/ports/queries/pet-tag.port';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { PET_TAG_GET_PORT, PET_TAG_UPDATE_PORT } from '../../domain/constants/pet-tag.tokens';
import { ImageProcessorService } from 'src/modules/storage/image-processor.service';
import { StorageService } from 'src/modules/storage/storage.service';

export interface PetImageUploadResult {
  petImageUrl: string;
  size: number;
  width: number;
  height: number;
}

/**
 * SPEC-016: subida/reemplazo de la foto de la mascota.
 * Flujo (RF-6): ownership → sharp (WebP ≤512×512) → R2 (pet-tag/{idQr}.webp) →
 * persiste petData.petImageUrl SOLO si el PUT a R2 fue exitoso (sin URL huérfana).
 */
@Injectable()
export class UploadPetImageUseCase {
  constructor(
    @Inject(PET_TAG_GET_PORT)
    private readonly getter: ICanGetPetTag,
    @Inject(PET_TAG_UPDATE_PORT)
    private readonly updater: ICanUpdatePetTag,
    private readonly imageProcessor: ImageProcessorService,
    private readonly storageService: StorageService,
    private readonly traceService: TraceService,
  ) {}

  async execute(
    idQr: string,
    requesterId: string,
    requesterRole: string,
    buffer: Buffer,
    tracking: TrackingContext,
  ): Promise<PetImageUploadResult> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'UploadPetImageUseCase - input', {
      idQr,
      requesterId,
      size: buffer.length,
    });

    // RF-4: validar que la placa existe y el requester es el dueño (o admin)
    const owner = await this.getter.getOwner(idQr, tracking);
    if (!owner) {
      throw new NotFoundException('Placa no encontrada');
    }
    const isAdmin = requesterRole === 'admin';
    if (!isAdmin && (!owner.userId || owner.userId !== requesterId)) {
      this.traceService.warn(tracking, TraceLayer.USE_CASE, 'UploadPetImageUseCase - forbidden', {
        idQr,
        requesterId,
        owner: owner.userId,
      });
      throw new ForbiddenException('No tienes permiso para subir una foto a esta placa');
    }

    // RF-6 paso 2: pipeline canónico (sharp → WebP ≤512×512, sin EXIF/metadata). 422 si corrupto.
    const { buffer: webpBuffer, width, height } = await this.imageProcessor.process(buffer);

    // RF-6 paso 3: subir a R2 con key pet-tag/{idQr}.webp (RF-7, sobrescribe al re-subir)
    const { publicUrl } = await this.storageService.uploadPetImage({
      idQr,
      buffer: webpBuffer,
      width,
      height,
    });

    // RF-6 paso 4: persiste SOLO si el PUT a R2 fue exitoso (userId null → admin sin filtro de dueño)
    await this.updater.setPetImageUrl(idQr, isAdmin ? null : requesterId, publicUrl, tracking);

    this.traceService.log(tracking, TraceLayer.USE_CASE, 'UploadPetImageUseCase - complete', {
      idQr,
      size: webpBuffer.length,
      width,
      height,
    });

    return { petImageUrl: publicUrl, size: webpBuffer.length, width, height };
  }
}

/**
 * SPEC-016 RF-8: eliminación de la foto de la mascota.
 * Siempre limpia petData.petImageUrl en Mongo; el borrado de R2 es mejor esfuerzo
 * (StorageService.deleteObject no relanza).
 */
@Injectable()
export class DeletePetImageUseCase {
  constructor(
    @Inject(PET_TAG_GET_PORT)
    private readonly getter: ICanGetPetTag,
    @Inject(PET_TAG_UPDATE_PORT)
    private readonly updater: ICanUpdatePetTag,
    private readonly storageService: StorageService,
    private readonly traceService: TraceService,
  ) {}

  async execute(
    idQr: string,
    requesterId: string,
    requesterRole: string,
    tracking: TrackingContext,
  ): Promise<{ petImageUrl: null }> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'DeletePetImageUseCase - input', {
      idQr,
      requesterId,
    });

    // RF-4: ownership
    const owner = await this.getter.getOwner(idQr, tracking);
    if (!owner) {
      throw new NotFoundException('Placa no encontrada');
    }
    const isAdmin = requesterRole === 'admin';
    if (!isAdmin && (!owner.userId || owner.userId !== requesterId)) {
      this.traceService.warn(tracking, TraceLayer.USE_CASE, 'DeletePetImageUseCase - forbidden', {
        idQr,
        requesterId,
        owner: owner.userId,
      });
      throw new ForbiddenException('No tienes permiso para eliminar la foto de esta placa');
    }

    // URL actual (para limpiar el objeto R2)
    const status = await this.getter.getStatus(idQr, tracking);
    const currentUrl = status?.petData?.petImageUrl ?? null;

    // RF-8: limpiar Mongo SIEMPRE (idempotente: sin URL previa también responde 200)
    await this.updater.setPetImageUrl(idQr, isAdmin ? null : requesterId, null, tracking);

    // RF-8: borrar objeto R2 (mejor esfuerzo — no aborta si falla; defensa en profundidad
    // ante cambios del servicio: el flujo de borrado de la URL en Mongo ya está completo)
    if (currentUrl) {
      try {
        await this.storageService.deleteObject(currentUrl);
      } catch (error) {
        this.traceService.error(
          tracking,
          TraceLayer.USE_CASE,
          'DeletePetImageUseCase - deleteObject failed (mejor esfuerzo)',
          error as Error,
        );
      }
    }

    this.traceService.log(tracking, TraceLayer.USE_CASE, 'DeletePetImageUseCase - complete', {
      idQr,
      hadImage: currentUrl !== null,
    });

    return { petImageUrl: null };
  }
}
