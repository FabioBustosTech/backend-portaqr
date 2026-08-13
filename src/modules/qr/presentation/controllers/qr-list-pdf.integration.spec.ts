import { Test } from '@nestjs/testing';
import { INestApplication, UnprocessableEntityException } from '@nestjs/common';
import * as request from 'supertest';
import { ThrottlerModule } from '@nestjs/throttler';
import { QrController } from './qr.controller';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/infrastructure/guards/roles.guard';
import { TraceService } from 'src/common/services/trace.service';
import { StorageService } from 'src/modules/storage/storage.service';
import { ImageProcessorService } from 'src/modules/storage/image-processor.service';
import { PdfSanitizerService } from 'src/modules/storage/pdf-sanitizer.service';
import { CreateQrUseCase } from 'src/modules/qr/application/use-cases/create-qr.usecase';
import { GetAllQrUseCase } from 'src/modules/qr/application/use-cases/get-all-qr.usecase';
import { GetQrUseCase } from 'src/modules/qr/application/use-cases/get-qr.usecase';
import { GetQrsByUserUseCase } from 'src/modules/qr/application/use-cases/get-qrs-by-user.usecase';
import { GetPaginatedQrsByUserUseCase } from 'src/modules/qr/application/use-cases/get-paginated-qrs-by-user.usecase';
import { GetFavoritesQrsUseCase } from 'src/modules/qr/application/use-cases/get-favorites-qrs.usecase';
import { GetRecentActiveQrUseCase } from 'src/modules/qr/application/use-cases/get-recent-active-qr.usecase';
import { GetPublicQrUseCase } from 'src/modules/qr/application/use-cases/get-public-qr.usecase';
import { UpdateQrUseCase } from 'src/modules/qr/application/use-cases/update-qr.usecase';
import { DeleteQrUseCase } from 'src/modules/qr/application/use-cases/delete-qr.usecase';

/**
 * Integración HTTP de POST /qr/list-pdf (SPEC-005 §8.1) con supertest + multipart.
 * - Sin MongoDB real, sin R2 real ni gs real: StorageService y PdfSanitizerService
 *   se mockean a nivel de módulo (overrideProvider) y GetQrUseCase/UpdateQrUseCase
 *   actúan como QrRepository fake del flujo.
 * - Ejercita el stack HTTP real: guards, FileInterceptor (multer: fileFilter 415,
 *   fileSize 413) y el handler completo.
 */
describe('POST /qr/list-pdf — integración multipart (SPEC-005 §8.1)', () => {
  let app: INestApplication;
  let getQrUseCase: { execute: jest.Mock };
  let updateQrUseCase: { execute: jest.Mock };
  let sanitizeMock: jest.Mock;
  let uploadPdfMock: jest.Mock;

  const ID_QR = '89302960-7799-43fe-b5a0-45d2295d539f';
  const PDF_URL = `https://images.portaqr.cl/qr-multilink-pdf/${ID_QR}-item-1.pdf`;

  const makeQr = (overrides: Record<string, unknown> = {}) => ({
    id: 'mongo-id-1',
    idQr: ID_QR,
    userId: 'user-1',
    data: { typeQr: 'list', urlList: [] },
    typeQr: 'list',
    ...overrides,
  });

  const pdfBuffer = () => Buffer.from('%PDF-1.7\nfake content for sanitization');

  const postPdf = (
    overrides: { idQr?: string; itemId?: string; buffer?: Buffer; filename?: string; contentType?: string },
  ) => {
    const req = request(app.getHttpServer()).post('/qr/list-pdf');
    req.field('idQr', overrides.idQr ?? ID_QR);
    req.field('itemId', overrides.itemId ?? 'item-1');
    req.attach(
      'file',
      overrides.buffer ?? pdfBuffer(),
      {
        filename: overrides.filename ?? 'menu.pdf',
        contentType: overrides.contentType ?? 'application/pdf',
      },
    );
    return req;
  };

  beforeAll(async () => {
    getQrUseCase = { execute: jest.fn() };
    updateQrUseCase = { execute: jest.fn() };
    sanitizeMock = jest.fn();
    uploadPdfMock = jest.fn();

    const moduleRef = await Test.createTestingModule({
      // SPEC-011: el controller usa QrPublicThrottlerGuard → registrar los
      // providers del throttler (THROTTLER:MODULE_OPTIONS + ThrottlerStorage)
      imports: [ThrottlerModule.forRoot({ throttlers: [{ limit: 100, ttl: 60_000 }] })],
      controllers: [QrController],
      providers: [
        { provide: CreateQrUseCase, useValue: { execute: jest.fn() } },
        { provide: GetAllQrUseCase, useValue: { execute: jest.fn() } },
        { provide: GetQrUseCase, useValue: getQrUseCase },
        { provide: GetQrsByUserUseCase, useValue: { execute: jest.fn() } },
        { provide: GetPaginatedQrsByUserUseCase, useValue: { execute: jest.fn() } },
        { provide: GetFavoritesQrsUseCase, useValue: { execute: jest.fn() } },
        { provide: GetRecentActiveQrUseCase, useValue: { execute: jest.fn() } },
        { provide: GetPublicQrUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateQrUseCase, useValue: updateQrUseCase },
        { provide: DeleteQrUseCase, useValue: { execute: jest.fn() } },
        { provide: TraceService, useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn() } },
        { provide: StorageService, useValue: { uploadPdf: uploadPdfMock, deleteObject: jest.fn() } },
        { provide: ImageProcessorService, useValue: { process: jest.fn() } },
        { provide: PdfSanitizerService, useValue: { sanitize: sanitizeMock } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: any) => {
          // Reemplaza al guard real: inyecta el usuario que JwtAuthGuard pondría en req.user
          ctx.switchToHttp().getRequest().user = { id: 'user-1', role: 'user' };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.MAX_PDF_ITEMS_PER_QR;
  });

  afterAll(async () => {
    delete process.env.MAX_PDF_ITEMS_PER_QR;
    await app.close();
  });

  it('200: archivo válido → { documentUrl, size, itemId } y updateQrUseCase persiste el item pdf', async () => {
    getQrUseCase.execute.mockResolvedValue(makeQr());
    sanitizeMock.mockResolvedValue({ buffer: Buffer.from('sanitized-pdf'), size: 14 });
    uploadPdfMock.mockResolvedValue({
      publicUrl: PDF_URL,
      key: `qr-multilink-pdf/${ID_QR}-item-1.pdf`,
      size: 14,
    });

    const res = await postPdf({}).expect(200);

    expect(res.body).toEqual({ documentUrl: PDF_URL, size: 14, itemId: 'item-1' });
    expect(sanitizeMock).toHaveBeenCalledWith(expect.any(Buffer));
    expect(uploadPdfMock).toHaveBeenCalledWith(
      expect.objectContaining({ idQr: ID_QR, itemId: 'item-1' }),
    );
    // El item pdf con documentUrl llega al updateQrUseCase (QrRepository fake)
    expect(updateQrUseCase.execute).toHaveBeenCalledWith(
      ID_QR,
      expect.objectContaining({
        data: expect.objectContaining({
          urlList: [{ itemId: 'item-1', typeUrl: 'pdf', documentUrl: PDF_URL }],
        }),
      }),
      expect.anything(),
    );
  });

  it('415: MIME no application/pdf → rechazado por el fileFilter de multer', async () => {
    getQrUseCase.execute.mockResolvedValue(makeQr());

    const res = await postPdf({
      buffer: Buffer.from('texto plano'),
      filename: 'nota.txt',
      contentType: 'text/plain',
    }).expect(415);

    expect(res.body.message).toEqual(expect.stringContaining('Solo se aceptan archivos PDF'));
    expect(sanitizeMock).not.toHaveBeenCalled();
    expect(uploadPdfMock).not.toHaveBeenCalled();
  });

  it('413: archivo mayor a PDF_MAX_UPLOAD_SIZE (default 2 MB) → rechazado por multer', async () => {
    const big = Buffer.alloc(2 * 1024 * 1024 + 1024, 1);
    const res = await postPdf({ buffer: big }).expect(413);
    expect(res.body.statusCode).toBe(413);
    expect(sanitizeMock).not.toHaveBeenCalled();
  });

  it('400 (RF-5): límite MAX_PDF_ITEMS_PER_QR alcanzado con item nuevo → rechaza antes de sanitizar', async () => {
    process.env.MAX_PDF_ITEMS_PER_QR = '1';
    getQrUseCase.execute.mockResolvedValue(
      makeQr({
        data: {
          typeQr: 'list',
          urlList: [{ itemId: 'pdf-1', typeUrl: 'pdf', documentUrl: 'https://x.cl/1.pdf' }],
        },
      }),
    );

    const res = await postPdf({ itemId: 'item-nuevo' }).expect(400);

    expect(res.body.message).toEqual(expect.stringContaining('Límite excedido'));
    expect(sanitizeMock).not.toHaveBeenCalled();
    expect(uploadPdfMock).not.toHaveBeenCalled();
    expect(updateQrUseCase.execute).not.toHaveBeenCalled();
  });

  it('422: gs no puede procesar el PDF → 422 y NO sube a R2 ni persiste', async () => {
    getQrUseCase.execute.mockResolvedValue(makeQr());
    sanitizeMock.mockRejectedValue(new UnprocessableEntityException('corrupto'));

    const res = await postPdf({ filename: 'roto.pdf' }).expect(422);

    expect(res.body.message).toEqual(expect.stringContaining('corrupto'));
    expect(uploadPdfMock).not.toHaveBeenCalled();
    expect(updateQrUseCase.execute).not.toHaveBeenCalled();
  });

  it('403: userId no coincide y no es admin', async () => {
    getQrUseCase.execute.mockResolvedValue(makeQr({ userId: 'otro-user' }));
    await postPdf({}).expect(403);
    expect(sanitizeMock).not.toHaveBeenCalled();
  });

  it('400: el QR no es de tipo list', async () => {
    getQrUseCase.execute.mockResolvedValue(
      makeQr({ typeQr: 'dynamic', data: { typeQr: 'dynamic', url: 'https://a.cl' } }),
    );
    await postPdf({}).expect(400);
    expect(sanitizeMock).not.toHaveBeenCalled();
  });

  it('400 (RF-13 paso 5): itemId existente que NO es typeUrl pdf → rechaza antes de sanitizar', async () => {
    getQrUseCase.execute.mockResolvedValue(
      makeQr({
        data: {
          typeQr: 'list',
          urlList: [{ itemId: 'web-1', typeUrl: 'web', url: 'https://a.cl' }],
        },
      }),
    );

    await postPdf({ itemId: 'web-1' }).expect(400);
    expect(sanitizeMock).not.toHaveBeenCalled();
    expect(uploadPdfMock).not.toHaveBeenCalled();
    expect(updateQrUseCase.execute).not.toHaveBeenCalled();
  });

  it('404: el QR no existe', async () => {
    getQrUseCase.execute.mockResolvedValue(null);
    await postPdf({}).expect(404);
    expect(sanitizeMock).not.toHaveBeenCalled();
  });

  it('400: falta el archivo (campo file ausente en el multipart)', async () => {
    getQrUseCase.execute.mockResolvedValue(makeQr());
    await request(app.getHttpServer())
      .post('/qr/list-pdf')
      .field('idQr', ID_QR)
      .field('itemId', 'item-1')
      .expect(400);
  });

  it('400: falta idQr', async () => {
    getQrUseCase.execute.mockResolvedValue(makeQr());
    await request(app.getHttpServer())
      .post('/qr/list-pdf')
      .field('itemId', 'item-1')
      .attach('file', pdfBuffer(), { filename: 'x.pdf', contentType: 'application/pdf' })
      .expect(400);
  });

  it('400: falta itemId', async () => {
    getQrUseCase.execute.mockResolvedValue(makeQr());
    await request(app.getHttpServer())
      .post('/qr/list-pdf')
      .field('idQr', ID_QR)
      .attach('file', pdfBuffer(), { filename: 'x.pdf', contentType: 'application/pdf' })
      .expect(400);
  });
});
