import { Injectable, UnprocessableEntityException } from '@nestjs/common';
// sharp es un módulo CJS sin esModuleInterop en tsconfig: se importa con require tipado
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp') as typeof import('sharp').default;

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
}

/**
 * Pipeline canónico de imagen (RF-7):
 * - SIN rotación (decisión 2026-08-07): solo redimensionado.
 * - resize a máx. 512×512 (fit inside, sin ampliar si es menor).
 * - Re-encode SIEMPRE a WebP (calidad 82, smartSubsample) → descarta
 *   EXIF/IPTC/XMP y cualquier contenido no-pixel (scripts embebidos, etc.).
 * - Si el binario no es decodificable → 422 Unprocessable Image.
 */
@Injectable()
export class ImageProcessorService {
  async process(buffer: Buffer): Promise<ProcessedImage> {
    try {
      const result = await sharp(buffer)
        .resize({
          width: 512,
          height: 512,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({
          quality: 82,
          effort: 4,
          smartSubsample: true,
        })
        .toBuffer({ resolveWithObject: true });

      return {
        buffer: result.data,
        width: result.info.width,
        height: result.info.height,
      };
    } catch {
      throw new UnprocessableEntityException(
        'La imagen no se pudo procesar: archivo corrupto o formato no soportado',
      );
    }
  }
}
