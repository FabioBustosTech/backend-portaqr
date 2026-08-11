import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { ImageProcessorService } from './image-processor.service';
import { PdfSanitizerService } from './pdf-sanitizer.service';

/**
 * Módulo de almacenamiento R2 + procesamiento de imágenes (SPEC-002) + sanitización PDF (SPEC-005).
 * Reutilizable por futuros features de imágenes (vcard-photos/, pet-photos/, etc.).
 * ConfigModule es global (app.module) → ConfigService está disponible sin importarlo.
 */
@Module({
  providers: [StorageService, ImageProcessorService, PdfSanitizerService],
  exports: [StorageService, ImageProcessorService, PdfSanitizerService],
})
export class StorageModule {}
