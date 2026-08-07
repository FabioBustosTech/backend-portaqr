import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { ImageProcessorService } from './image-processor.service';

/**
 * Módulo de almacenamiento R2 + procesamiento de imágenes (SPEC-002).
 * Reutilizable por futuros features de imágenes (vcard-photos/, pet-photos/, etc.).
 * ConfigModule es global (app.module) → ConfigService está disponible sin importarlo.
 */
@Module({
  providers: [StorageService, ImageProcessorService],
  exports: [StorageService, ImageProcessorService],
})
export class StorageModule {}
