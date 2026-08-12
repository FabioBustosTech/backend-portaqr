import { UnprocessableEntityException } from '@nestjs/common';
// sharp es un módulo CJS sin esModuleInterop en tsconfig: se importa con require tipado
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp') as typeof import('sharp').default;
import { ImageProcessorService } from './image-processor.service';

describe('ImageProcessorService', () => {
  const service = new ImageProcessorService();

  async function makePng(width: number, height: number): Promise<Buffer> {
    return sharp({
      create: { width, height, channels: 3, background: { r: 200, g: 30, b: 30 } },
    })
      .png()
      .toBuffer();
  }

  it('redimensiona una imagen grande a máx. 512×512 preservando aspect ratio', async () => {
    const input = await makePng(1024, 768);
    const result = await service.process(input);

    expect(result.width).toBe(512);
    expect(result.height).toBe(384);
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it('NO amplía imágenes menores a 512px (withoutEnlargement)', async () => {
    const input = await makePng(100, 50);
    const result = await service.process(input);

    expect(result.width).toBe(100);
    expect(result.height).toBe(50);
  });

  it('convierte SIEMPRE a WebP (descarta formato original)', async () => {
    const input = await makePng(300, 300);
    const result = await service.process(input);

    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe('webp');
  });

  it('solo toma el primer frame de un GIF animado', async () => {
    // GIF animado 2 frames de 200x200 rojo/azul
    const gifBuffer = await sharp({
      create: { width: 200, height: 200, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .gif()
      .toBuffer();
    const result = await service.process(gifBuffer);

    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe('webp');
    expect(result.width).toBe(200);
    expect(result.height).toBe(200);
  });

  it('lanza 422 UnprocessableEntityException con un binario corrupto', async () => {
    await expect(service.process(Buffer.from('esto no es una imagen')))
      .rejects
      .toThrow(UnprocessableEntityException);
  });
});
