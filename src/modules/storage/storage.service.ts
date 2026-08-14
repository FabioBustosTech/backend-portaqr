import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

export interface UploadedImage {
  publicUrl: string;
  key: string;
  size: number;
}

export interface UploadedPdf {
  publicUrl: string;
  key: string;
  size: number;
}

export interface UploadedPetImage {
  publicUrl: string;
  key: string;
  size: number;
}

/**
 * Servicio de almacenamiento Cloudflare R2 (S3-compatible).
 * - `uploadImage`: sube el WebP ya procesado con key `qr-multilink/{idQr}.webp`
 *   (sobrescribe el mismo objeto al cambiar la imagen — RF-11).
 * - `uploadPdf`: sube el PDF ya sanitizado con key `qr-multilink-pdf/{idQr}-{itemId}.pdf`
 *   (SPEC-005 RF-11 — sobrescribe el mismo objeto al reemplazar el PDF del item).
 * - `uploadPetImage`: sube el WebP de la foto de la mascota con key `pet-tag/{idQr}.webp`
 *   (SPEC-016 RF-7 — sobrescribe el mismo objeto al re-subir la foto).
 * - `deleteObject`: borra el objeto extraído de la URL pública (RF-14),
 *   mejor esfuerzo: si falla registra ERROR y no relanza (no aborta el flujo).
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly r2: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = (this.configService.get<string>('CLOUDFLARE_R2_ENDPOINT') ?? '').replace(/\/+$/, '');
    const accessKeyId = this.configService.get<string>('CLOUDFLARE_R2_ACCESS_KEY_ID') ?? '';
    const secretAccessKey = this.configService.get<string>('CLOUDFLARE_R2_SECRET_ACCESS_KEY') ?? '';
    this.bucket = this.configService.get<string>('CLOUDFLARE_R2_BUCKET_NAME') ?? 'portaqr-assets';
    this.publicBaseUrl = (this.configService.get<string>('CLOUDFLARE_R2_PUBLIC_URL') ?? '').replace(/\/+$/, '');

    this.r2 = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async uploadImage(input: {
    idQr: string;
    buffer: Buffer;
    width: number;
    height: number;
  }): Promise<UploadedImage> {
    const key = `qr-multilink/${input.idQr}.webp`;
    const publicUrl = this.publicBaseUrl ? `${this.publicBaseUrl}/${key}` : key;

    await this.r2.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.buffer,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    this.logger.log(
      `r2_object_put { idQr: ${input.idQr}, size: ${input.buffer.length}, width: ${input.width}, height: ${input.height} }`,
    );
    return { publicUrl, key, size: input.buffer.length };
  }

  /**
   * Sube un PDF ya sanitizado (SPEC-005 RF-10/RF-11) con key
   * `qr-multilink-pdf/{idQr}-{itemId}.pdf` (ContentType application/pdf).
   */
  async uploadPdf(input: {
    idQr: string;
    itemId: string;
    buffer: Buffer; // PDF ya sanitizado por Ghostscript
  }): Promise<UploadedPdf> {
    const key = `qr-multilink-pdf/${input.idQr}-${input.itemId}.pdf`;
    const publicUrl = this.publicBaseUrl ? `${this.publicBaseUrl}/${key}` : key;

    await this.r2.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.buffer,
        ContentType: 'application/pdf',
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    this.logger.log(
      `r2_object_put { idQr: ${input.idQr}, itemId: ${input.itemId}, size: ${input.buffer.length} }`,
    );
    return { publicUrl, key, size: input.buffer.length };
  }

  /**
   * Sube la foto de la mascota ya procesada (SPEC-016 RF-7) con key
   * `pet-tag/{idQr}.webp` (ContentType image/webp, CacheControl immutable).
   * Re-subir el mismo idQr sobrescribe el mismo objeto (sin versiones huérfanas).
   */
  async uploadPetImage(input: {
    idQr: string;
    buffer: Buffer; // WebP ya procesado por ImageProcessorService
    width: number;
    height: number;
  }): Promise<UploadedPetImage> {
    const key = `pet-tag/${input.idQr}.webp`;
    const publicUrl = this.publicBaseUrl ? `${this.publicBaseUrl}/${key}` : key;

    await this.r2.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.buffer,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    this.logger.log(
      `r2_object_put { idQr: ${input.idQr}, size: ${input.buffer.length}, width: ${input.width}, height: ${input.height} }`,
    );
    return { publicUrl, key, size: input.buffer.length };
  }

  /** Borra el objeto R2 a partir de su URL pública (mejor esfuerzo — RF-14). */
  async deleteObject(publicUrl: string): Promise<void> {
    const key = this.extractKeyFromUrl(publicUrl);
    if (!key) return;

    try {
      await this.r2.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      this.logger.log(`r2_object_deleted { key: ${key} }`);
    } catch (error) {
      // No aborta el flujo: queda objeto huérfano que limpia el lifecycle (§6.4)
      this.logger.error(`r2_failed_delete { key: ${key} }`, error as Error);
    }
  }

  private extractKeyFromUrl(publicUrl: string): string | null {
    if (!publicUrl) return null;
    if (this.publicBaseUrl && publicUrl.startsWith(this.publicBaseUrl)) {
      return publicUrl.slice(this.publicBaseUrl.length + 1);
    }
    // Soporta los prefijos: qr-multilink/ (SPEC-002), qr-multilink-pdf/ (SPEC-005) y pet-tag/ (SPEC-016)
    const match = publicUrl.match(/(?:qr-multilink(?:-pdf)?|pet-tag)\/[\w-]+\.(?:webp|pdf)$/);
    return match ? match[0] : null;
  }
}
