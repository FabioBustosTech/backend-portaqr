import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
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
    R2_ACCOUNT_ID: 'acct-123',
    R2_ACCESS_KEY_ID: 'key',
    R2_SECRET_ACCESS_KEY: 'secret',
    R2_BUCKET_NAME: 'portaqr-assets',
    R2_PUBLIC_BASE_URL: 'https://images.portaqr.cl',
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
      const service = createService({ R2_PUBLIC_BASE_URL: 'https://pub-abc.r2.dev/' });
      const result = await service.uploadImage({
        idQr: 'uuid-1',
        buffer: Buffer.from('x'),
        width: 1,
        height: 1,
      });
      expect(result.publicUrl).toBe('https://pub-abc.r2.dev/qr-multilink/uuid-1.webp');
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
  });
});
