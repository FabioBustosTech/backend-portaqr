import { S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

jest.mock('@aws-sdk/client-s3', () => {
  const sendMock = jest.fn().mockResolvedValue({});
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
    PutObjectCommand: jest.fn().mockImplementation((input) => ({ input, name: 'PutObjectCommand' })),
    DeleteObjectCommand: jest.fn().mockImplementation((input) => ({ input, name: 'DeleteObjectCommand' })),
  };
});

const mockedSend = () => {
  const m = jest.mocked(S3Client);
  const instance = (m as unknown as jest.Mock).mock.results[0]?.value;
  return instance?.send ?? jest.fn().mockResolvedValue({});
};

function createService(overrides: Record<string, string> = {}) {
  const config = new ConfigService({
    CLOUDFLARE_R2_ENDPOINT: 'https://acct-123.r2.cloudflarestorage.com',
    CLOUDFLARE_R2_ACCESS_KEY_ID: 'key',
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: 'secret',
    CLOUDFLARE_R2_BUCKET_NAME: 'portaqr-assets',
    CLOUDFLARE_R2_PUBLIC_URL: 'https://images.portaqr.cl',
    ...overrides,
  });
  return new StorageService(config);
}

describe('StorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (S3Client as unknown as jest.Mock).mockClear();
  });

  describe('uploadImage', () => {
    it('genera key qr-multilink/{idQr}.webp y publicUrl compuesta', async () => {
      const service = createService();
      const result = await service.uploadImage({
        idQr: '89302960-7799-43fe-b5a0-45d2295d539f',
        buffer: Buffer.from('webp-data'),
        width: 512,
        height: 384,
      });

      expect(result.key).toBe('qr-multilink/89302960-7799-43fe-b5a0-45d2295d539f.webp');
      expect(result.publicUrl).toBe(
        'https://images.portaqr.cl/qr-multilink/89302960-7799-43fe-b5a0-45d2295d539f.webp',
      );
      expect(result.size).toBe(9);

      const send = mockedSend();
      expect(send).toHaveBeenCalledTimes(1);
      const cmd = (send as jest.Mock).mock.calls[0][0];
      expect(cmd.name).toBe('PutObjectCommand');
      expect(cmd.input).toMatchObject({
        Bucket: 'portaqr-assets',
        Key: 'qr-multilink/89302960-7799-43fe-b5a0-45d2295d539f.webp',
        ContentType: 'image/webp',
      });
      expect(cmd.input.Body).toEqual(Buffer.from('webp-data'));
    });

    it('usa la URL pública sin slash final aunque venga con él', async () => {
      const service = createService({ CLOUDFLARE_R2_PUBLIC_URL: 'https://pub-abc.r2.dev/' });
      const result = await service.uploadImage({
        idQr: 'uuid-1',
        buffer: Buffer.from('x'),
        width: 1,
        height: 1,
      });
      expect(result.publicUrl).toBe('https://pub-abc.r2.dev/qr-multilink/uuid-1.webp');
    });

    it('usa la key como publicUrl cuando no hay publicBaseUrl configurado', async () => {
      const service = createService({ CLOUDFLARE_R2_PUBLIC_URL: '' });
      const result = await service.uploadImage({
        idQr: 'uuid-1',
        buffer: Buffer.from('x'),
        width: 1,
        height: 1,
      });
      expect(result.publicUrl).toBe('qr-multilink/uuid-1.webp');
    });
  });

  describe('uploadPdf', () => {
    it('genera key qr-multilink-pdf/{idQr}-{itemId}.pdf y publicUrl compuesta', async () => {
      const service = createService();
      const result = await service.uploadPdf({
        idQr: '89302960-7799-43fe-b5a0-45d2295d539f',
        itemId: 'item-abc-123',
        buffer: Buffer.from('%PDF-1.7'),
      });

      expect(result.key).toBe('qr-multilink-pdf/89302960-7799-43fe-b5a0-45d2295d539f-item-abc-123.pdf');
      expect(result.publicUrl).toBe(
        'https://images.portaqr.cl/qr-multilink-pdf/89302960-7799-43fe-b5a0-45d2295d539f-item-abc-123.pdf',
      );
      expect(result.size).toBe(8);

      const send = mockedSend();
      expect(send).toHaveBeenCalledTimes(1);
      const cmd = (send as jest.Mock).mock.calls[0][0];
      expect(cmd.name).toBe('PutObjectCommand');
      expect(cmd.input).toMatchObject({
        Bucket: 'portaqr-assets',
        Key: 'qr-multilink-pdf/89302960-7799-43fe-b5a0-45d2295d539f-item-abc-123.pdf',
        ContentType: 'application/pdf',
        CacheControl: 'public, max-age=31536000, immutable',
      });
      expect(cmd.input.Body).toEqual(Buffer.from('%PDF-1.7'));
    });

    it('usa la key como publicUrl cuando no hay base URL configurada', async () => {
      const service = createService({ CLOUDFLARE_R2_PUBLIC_URL: '' });
      const result = await service.uploadPdf({
        idQr: 'uuid-1',
        itemId: 'item-1',
        buffer: Buffer.from('x'),
      });

      expect(result.key).toBe('qr-multilink-pdf/uuid-1-item-1.pdf');
      expect(result.publicUrl).toBe('qr-multilink-pdf/uuid-1-item-1.pdf');
    });

    it('funciona con ConfigService sin variables R2 (fallbacks del constructor)', async () => {
      const service = new StorageService(new ConfigService({}));
      const result = await service.uploadPdf({
        idQr: 'uuid-1',
        itemId: 'item-1',
        buffer: Buffer.from('x'),
      });

      expect(result.publicUrl).toBe('qr-multilink-pdf/uuid-1-item-1.pdf');
      const cmd = (mockedSend() as jest.Mock).mock.calls[0][0];
      expect(cmd.input.Bucket).toBe('portaqr-assets');
    });

    it('propaga el error si PutObject falla (a diferencia de deleteObject NO es mejor esfuerzo)', async () => {
      const send = jest.fn().mockRejectedValue(new Error('R2 endpoint down'));
      (S3Client as unknown as jest.Mock).mockImplementationOnce(() => ({ send }));

      const service = createService();
      await expect(
        service.uploadPdf({ idQr: 'uuid-1', itemId: 'item-1', buffer: Buffer.from('x') }),
      ).rejects.toThrow('R2 endpoint down');
    });
  });

  describe('deleteObject', () => {
    it('extrae el key de la publicUrl y llama DeleteObjectCommand', async () => {
      const service = createService();
      await service.deleteObject(
        'https://images.portaqr.cl/qr-multilink/uuid-1.webp',
      );

      const send = mockedSend();
      expect(send).toHaveBeenCalledTimes(1);
      const cmd = (send as jest.Mock).mock.calls[0][0];
      expect(cmd.name).toBe('DeleteObjectCommand');
      expect(cmd.input).toEqual({ Bucket: 'portaqr-assets', Key: 'qr-multilink/uuid-1.webp' });
    });

    it('extrae el key de un publicUrl con prefijo qr-multilink-pdf/ (SPEC-005)', async () => {
      const service = createService();
      await service.deleteObject(
        'https://images.portaqr.cl/qr-multilink-pdf/uuid-1-item-abc.pdf',
      );

      const send = mockedSend();
      expect(send).toHaveBeenCalledTimes(1);
      const cmd = (send as jest.Mock).mock.calls[0][0];
      expect(cmd.name).toBe('DeleteObjectCommand');
      expect(cmd.input).toEqual({
        Bucket: 'portaqr-assets',
        Key: 'qr-multilink-pdf/uuid-1-item-abc.pdf',
      });
    });

    it('extrae el key por regex cuando el publicUrl NO usa el publicBaseUrl configurado', async () => {
      const service = createService(); // publicBaseUrl = https://images.portaqr.cl
      await service.deleteObject('https://cdn.otro.cl/qr-multilink-pdf/uuid-item-9.pdf');

      const send = mockedSend();
      expect(send).toHaveBeenCalledTimes(1);
      const cmd = (send as jest.Mock).mock.calls[0][0];
      expect(cmd.name).toBe('DeleteObjectCommand');
      expect(cmd.input).toEqual({
        Bucket: 'portaqr-assets',
        Key: 'qr-multilink-pdf/uuid-item-9.pdf',
      });
    });

    it('NO lanza cuando la subida/borrado falla (mejor esfuerzo — RF-14)', async () => {
      const send = jest.fn().mockRejectedValue(new Error('red down'));
      (S3Client as unknown as jest.Mock).mockImplementationOnce(() => ({ send }));

      const service = createService();
      await expect(
        service.deleteObject('https://images.portaqr.cl/qr-multilink/uuid-1.webp'),
      ).resolves.toBeUndefined();
    });

    it('no llama al SDK si la URL no es reconocible', async () => {
      const service = createService();
      await service.deleteObject('https://otro-dominio.com/no-es-qr.jpg');
      expect(mockedSend()).not.toHaveBeenCalled();
    });

    it('no llama al SDK si la URL es vacía o nula', async () => {
      const service = createService();
      await service.deleteObject('');
      await service.deleteObject(null as unknown as string);
      expect(mockedSend()).not.toHaveBeenCalled();
    });
  });
});
