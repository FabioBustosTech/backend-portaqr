import { ForbiddenException, BadRequestException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { QrController } from './qr.controller';

// ── Mocks de dependencias ────────────────────────────────────────────────────
function makeTraceService() {
  return { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
}

function makeQr(typeQr = 'list', overrides: Record<string, unknown> = {}) {
  return {
    id: 'mongo-id-1',
    idQr: '89302960-7799-43fe-b5a0-45d2295d539f',
    userId: 'user-1',
    data: { typeQr, urlList: [{ typeUrl: 'web', url: 'https://ejemplo.cl' }] },
    typeQr,
    ...overrides,
  };
}

function makeUser(role = 'user') {
  return { id: 'user-1', role } as any;
}

function makeFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'foto.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('fake-jpeg'),
    size: 9,
    ...overrides,
  } as Express.Multer.File;
}

function createController(overrides: Record<string, unknown> = {}) {
  const mocks: Record<string, any> = {
    getQrUseCase: { execute: jest.fn() },
    updateQrUseCase: { execute: jest.fn() },
    deactivateQrUseCase: { execute: jest.fn() }, // SPEC-014
    storageService: { uploadImage: jest.fn(), uploadPdf: jest.fn(), deleteObject: jest.fn() },
    imageProcessor: { process: jest.fn() },
    pdfSanitizer: { sanitize: jest.fn() },
    traceService: makeTraceService(),
  };
  Object.assign(mocks, overrides);

  const controller = new QrController(
    mocks.createQrUseCase ?? { execute: jest.fn() },
    mocks.getAllQrUseCase ?? { execute: jest.fn() },
    mocks.getQrUseCase,
    mocks.getQrsByUserUseCase ?? { execute: jest.fn() },
    mocks.getPaginatedQrsByUserUseCase ?? { execute: jest.fn() },
    mocks.getFavoritesQrsUseCase ?? { execute: jest.fn() },
    mocks.getRecentActiveQrUseCase ?? { execute: jest.fn() },
    mocks.getPublicQrUseCase ?? { execute: jest.fn() },
    mocks.updateQrUseCase,
    mocks.deleteQrUseCase ?? { execute: jest.fn() },
    mocks.deactivateQrUseCase,
    mocks.traceService,
    mocks.storageService,
    mocks.imageProcessor,
    mocks.pdfSanitizer,
  );
  return { controller, mocks };
}

const tracking = {} as any;

describe('QrController — POST /qr/list-image (SPEC-002)', () => {
  it('200: sube, procesa, persiste y retorna { listImageUrl, size, width, height }', async () => {
    const { controller, mocks } = createController();
    mocks.getQrUseCase.execute.mockResolvedValue(makeQr('list'));
    mocks.imageProcessor.process.mockResolvedValue({ buffer: Buffer.from('webp'), width: 512, height: 384 });
    mocks.storageService.uploadImage.mockResolvedValue({
      publicUrl: 'https://images.portaqr.cl/qr-multilink/uuid.webp',
      key: 'qr-multilink/uuid.webp',
      size: 4,
    });

    const result = await controller.uploadListImage(
      makeFile(),
      '89302960-7799-43fe-b5a0-45d2295d539f',
      makeUser(),
      tracking,
    );

    expect(result).toEqual({
      listImageUrl: 'https://images.portaqr.cl/qr-multilink/uuid.webp',
      size: 4,
      width: 512,
      height: 384,
    });
    expect(mocks.storageService.uploadImage).toHaveBeenCalledWith(
      expect.objectContaining({
        idQr: '89302960-7799-43fe-b5a0-45d2295d539f',
        width: 512,
        height: 384,
      }),
    );
    // Persiste la URL en el QR (data completa + listImageUrl)
    expect(mocks.updateQrUseCase.execute).toHaveBeenCalledWith(
      '89302960-7799-43fe-b5a0-45d2295d539f',
      expect.objectContaining({ data: expect.objectContaining({ listImageUrl: 'https://images.portaqr.cl/qr-multilink/uuid.webp' }) }),
      tracking,
    );
  });

  it('400: rechaza si falta el archivo', async () => {
    const { controller } = createController();
    await expect(
      controller.uploadListImage(undefined as any, 'uuid', makeUser(), tracking),
    ).rejects.toThrow(BadRequestException);
  });

  it('400: rechaza si falta idQr', async () => {
    const { controller } = createController();
    await expect(
      controller.uploadListImage(makeFile(), '', makeUser(), tracking),
    ).rejects.toThrow(BadRequestException);
  });

  it('404: rechaza si el QR no existe', async () => {
    const { controller, mocks } = createController();
    mocks.getQrUseCase.execute.mockResolvedValue(null);
    await expect(
      controller.uploadListImage(makeFile(), 'uuid', makeUser(), tracking),
    ).rejects.toThrow(NotFoundException);
  });

  it('403: rechaza a un usuario NO propietario (y no admin)', async () => {
    const { controller, mocks } = createController();
    mocks.getQrUseCase.execute.mockResolvedValue(makeQr('list', { userId: 'otro-user' }));
    await expect(
      controller.uploadListImage(makeFile(), 'uuid', makeUser(), tracking),
    ).rejects.toThrow(ForbiddenException);
  });

  it('403: un admin SÍ puede subir a un QR de otro usuario', async () => {
    const { controller, mocks } = createController();
    mocks.getQrUseCase.execute.mockResolvedValue(makeQr('list', { userId: 'otro-user' }));
    mocks.imageProcessor.process.mockResolvedValue({ buffer: Buffer.from('w'), width: 10, height: 10 });
    mocks.storageService.uploadImage.mockResolvedValue({ publicUrl: 'https://x.cl/q.webp', key: 'q.webp', size: 1 });

    const result = await controller.uploadListImage(makeFile(), 'uuid', makeUser('admin'), tracking);
    expect(result.listImageUrl).toBe('https://x.cl/q.webp');
  });

  it('400: rechaza si el QR no es de tipo list', async () => {
    const { controller, mocks } = createController();
    mocks.getQrUseCase.execute.mockResolvedValue(makeQr('dynamic'));
    await expect(
      controller.uploadListImage(makeFile(), 'uuid', makeUser(), tracking),
    ).rejects.toThrow(BadRequestException);
  });

  it('422: propaga el error de sharp al no poder procesar el binario', async () => {
    const { controller, mocks } = createController();
    mocks.getQrUseCase.execute.mockResolvedValue(makeQr('list'));
    mocks.imageProcessor.process.mockRejectedValue(new UnprocessableEntityException('no decodificable'));

    await expect(
      controller.uploadListImage(makeFile(), 'uuid', makeUser(), tracking),
    ).rejects.toThrow(UnprocessableEntityException);
    expect(mocks.storageService.uploadImage).not.toHaveBeenCalled();
  });
});

describe('QrController — PATCH /qr/:id con listImageUrl (SPEC-002)', () => {
  it('RF-4: ignora listImageUrl si el QR actual NO es de tipo list', async () => {
    const { controller, mocks } = createController();
    mocks.getQrUseCase.execute.mockResolvedValue(makeQr('dynamic', { data: { typeQr: 'dynamic', url: 'https://a.cl' } }));

    const dto = { data: { typeQr: 'dynamic' as const, url: 'https://a.cl', listImageUrl: 'https://images.portaqr.cl/qr-multilink/x.webp' } };
    await controller.update('uuid', dto as any, makeUser(), tracking);

    expect(mocks.updateQrUseCase.execute).toHaveBeenCalledWith('uuid', dto, tracking);
    expect(dto.data.listImageUrl).toBeUndefined(); // campo eliminado antes de persistir
    expect(mocks.storageService.deleteObject).not.toHaveBeenCalled();
  });

  it('RF-14: borra el objeto R2 anterior cuando la imagen se elimina (null)', async () => {
    const { controller, mocks } = createController();
    mocks.getQrUseCase.execute.mockResolvedValue(
      makeQr('list', { data: { typeQr: 'list', urlList: [], listImageUrl: 'https://images.portaqr.cl/qr-multilink/old.webp' } }),
    );

    const dto = { data: { typeQr: 'list' as const, urlList: [], listImageUrl: null } };
    await controller.update('uuid', dto as any, makeUser(), tracking);

    expect(mocks.storageService.deleteObject).toHaveBeenCalledWith('https://images.portaqr.cl/qr-multilink/old.webp');
  });

  it('RF-15: borra el objeto anterior cuando la URL cambia', async () => {
    const { controller, mocks } = createController();
    mocks.getQrUseCase.execute.mockResolvedValue(
      makeQr('list', { data: { typeQr: 'list', urlList: [], listImageUrl: 'https://images.portaqr.cl/qr-multilink/old.webp' } }),
    );

    const dto = { data: { typeQr: 'list' as const, urlList: [], listImageUrl: 'https://images.portaqr.cl/qr-multilink/new.webp' } };
    await controller.update('uuid', dto as any, makeUser(), tracking);

    expect(mocks.storageService.deleteObject).toHaveBeenCalledWith('https://images.portaqr.cl/qr-multilink/old.webp');
  });

  it('NO borra nada si la URL no cambia (mismo valor)', async () => {
    const { controller, mocks } = createController();
    mocks.getQrUseCase.execute.mockResolvedValue(
      makeQr('list', { data: { typeQr: 'list', urlList: [], listImageUrl: 'https://images.portaqr.cl/qr-multilink/same.webp' } }),
    );

    const dto = { data: { typeQr: 'list' as const, urlList: [], listImageUrl: 'https://images.portaqr.cl/qr-multilink/same.webp' } };
    await controller.update('uuid', dto as any, makeUser(), tracking);

    expect(mocks.storageService.deleteObject).not.toHaveBeenCalled();
  });
});

describe('QrController — POST /qr/list-pdf (SPEC-005)', () => {
  const PDF_URL = 'https://images.portaqr.cl/qr-multilink-pdf/89302960-7799-43fe-b5a0-45d2295d539f-item-1.pdf';

  function makePdfFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
    return makeFile({ mimetype: 'application/pdf', originalname: 'menu.pdf', ...overrides });
  }

  afterEach(() => {
    delete process.env.MAX_PDF_ITEMS_PER_QR;
  });

  it('200: item nuevo → sanitiza, sube a R2, persiste y retorna { documentUrl, size, itemId }', async () => {
    const { controller, mocks } = createController();
    mocks.getQrUseCase.execute.mockResolvedValue(makeQr('list', { data: { typeQr: 'list', urlList: [] } }));
    mocks.pdfSanitizer.sanitize.mockResolvedValue({ buffer: Buffer.from('sanitized'), size: 10 });
    mocks.storageService.uploadPdf.mockResolvedValue({ publicUrl: PDF_URL, key: 'qr-multilink-pdf/uuid-item-1.pdf', size: 10 });

    const result = await controller.uploadListPdf(
      makePdfFile(),
      '89302960-7799-43fe-b5a0-45d2295d539f',
      'item-1',
      makeUser(),
      tracking,
    );

    expect(result).toEqual({ documentUrl: PDF_URL, size: 10, itemId: 'item-1' });
    expect(mocks.pdfSanitizer.sanitize).toHaveBeenCalledWith(expect.any(Buffer));
    expect(mocks.storageService.uploadPdf).toHaveBeenCalledWith(
      expect.objectContaining({ idQr: '89302960-7799-43fe-b5a0-45d2295d539f', itemId: 'item-1' }),
    );
    expect(mocks.updateQrUseCase.execute).toHaveBeenCalledWith(
      '89302960-7799-43fe-b5a0-45d2295d539f',
      expect.objectContaining({
        data: expect.objectContaining({
          urlList: [{ itemId: 'item-1', typeUrl: 'pdf', documentUrl: PDF_URL }],
        }),
      }),
      tracking,
    );
  });

  it('200: reemplazo → sobrescribe documentUrl del item existente y preserva los demás', async () => {
    const { controller, mocks } = createController();
    const existing = [
      { itemId: 'item-1', typeUrl: 'pdf', documentUrl: 'https://x.cl/old.pdf' },
      { itemId: 'item-2', typeUrl: 'web', url: 'https://b.cl' },
    ];
    mocks.getQrUseCase.execute.mockResolvedValue(makeQr('list', { data: { typeQr: 'list', urlList: existing } }));
    mocks.pdfSanitizer.sanitize.mockResolvedValue({ buffer: Buffer.from('s'), size: 1 });
    mocks.storageService.uploadPdf.mockResolvedValue({ publicUrl: PDF_URL, key: 'k', size: 1 });

    await controller.uploadListPdf(makePdfFile(), '89302960-7799-43fe-b5a0-45d2295d539f', 'item-1', makeUser(), tracking);

    expect(mocks.updateQrUseCase.execute).toHaveBeenCalledWith(
      '89302960-7799-43fe-b5a0-45d2295d539f',
      expect.objectContaining({
        data: expect.objectContaining({
          urlList: [
            { itemId: 'item-1', typeUrl: 'pdf', documentUrl: PDF_URL },
            { itemId: 'item-2', typeUrl: 'web', url: 'https://b.cl' },
          ],
        }),
      }),
      tracking,
    );
  });

  it('400: rechaza si falta el archivo', async () => {
    const { controller } = createController();
    await expect(
      controller.uploadListPdf(undefined as any, 'uuid', 'item-1', makeUser(), tracking),
    ).rejects.toThrow(BadRequestException);
  });

  it('400: rechaza si falta idQr', async () => {
    const { controller } = createController();
    await expect(
      controller.uploadListPdf(makePdfFile(), '', 'item-1', makeUser(), tracking),
    ).rejects.toThrow(BadRequestException);
  });

  it('400: rechaza si falta itemId', async () => {
    const { controller } = createController();
    await expect(
      controller.uploadListPdf(makePdfFile(), 'uuid', '', makeUser(), tracking),
    ).rejects.toThrow(BadRequestException);
  });

  it('404: rechaza si el QR no existe', async () => {
    const { controller, mocks } = createController();
    mocks.getQrUseCase.execute.mockResolvedValue(null);
    await expect(
      controller.uploadListPdf(makePdfFile(), 'uuid', 'item-1', makeUser(), tracking),
    ).rejects.toThrow(NotFoundException);
  });

  it('403: rechaza a un usuario NO propietario (y no admin)', async () => {
    const { controller, mocks } = createController();
    mocks.getQrUseCase.execute.mockResolvedValue(makeQr('list', { userId: 'otro-user' }));
    await expect(
      controller.uploadListPdf(makePdfFile(), 'uuid', 'item-1', makeUser(), tracking),
    ).rejects.toThrow(ForbiddenException);
  });

  it('200: un admin SÍ puede subir a un QR de otro usuario', async () => {
    const { controller, mocks } = createController();
    mocks.getQrUseCase.execute.mockResolvedValue(makeQr('list', { userId: 'otro-user', data: { typeQr: 'list', urlList: [] } }));
    mocks.pdfSanitizer.sanitize.mockResolvedValue({ buffer: Buffer.from('s'), size: 1 });
    mocks.storageService.uploadPdf.mockResolvedValue({ publicUrl: PDF_URL, key: 'k', size: 1 });

    const result = await controller.uploadListPdf(makePdfFile(), 'uuid', 'item-1', makeUser('admin'), tracking);
    expect(result.documentUrl).toBe(PDF_URL);
  });

  it('400: rechaza si el QR no es de tipo list', async () => {
    const { controller, mocks } = createController();
    mocks.getQrUseCase.execute.mockResolvedValue(makeQr('dynamic'));
    await expect(
      controller.uploadListPdf(makePdfFile(), 'uuid', 'item-1', makeUser(), tracking),
    ).rejects.toThrow(BadRequestException);
  });

  it('400 (RF-13 paso 5): itemId existente que NO es tipo pdf → rechaza ANTES de sanitizar/subir', async () => {
    const { controller, mocks } = createController();
    mocks.getQrUseCase.execute.mockResolvedValue(
      makeQr('list', { data: { typeQr: 'list', urlList: [{ itemId: 'item-web', typeUrl: 'web', url: 'https://a.cl' }] } }),
    );

    await expect(
      controller.uploadListPdf(makePdfFile(), 'uuid', 'item-web', makeUser(), tracking),
    ).rejects.toThrow(BadRequestException);
    expect(mocks.pdfSanitizer.sanitize).not.toHaveBeenCalled();
    expect(mocks.storageService.uploadPdf).not.toHaveBeenCalled();
    expect(mocks.updateQrUseCase.execute).not.toHaveBeenCalled();
  });

  it('400 (RF-5): límite MAX_PDF_ITEMS_PER_QR alcanzado con item nuevo → rechaza ANTES de sanitizar/subir', async () => {
    process.env.MAX_PDF_ITEMS_PER_QR = '2';
    const { controller, mocks } = createController();
    mocks.getQrUseCase.execute.mockResolvedValue(
      makeQr('list', {
        data: {
          typeQr: 'list',
          urlList: [
            { itemId: 'pdf-1', typeUrl: 'pdf', documentUrl: 'https://x.cl/1.pdf' },
            { itemId: 'pdf-2', typeUrl: 'pdf', documentUrl: 'https://x.cl/2.pdf' },
          ],
        },
      }),
    );

    await expect(
      controller.uploadListPdf(makePdfFile(), 'uuid', 'pdf-nuevo', makeUser(), tracking),
    ).rejects.toThrow(BadRequestException);
    expect(mocks.pdfSanitizer.sanitize).not.toHaveBeenCalled();
    expect(mocks.storageService.uploadPdf).not.toHaveBeenCalled();
    expect(mocks.updateQrUseCase.execute).not.toHaveBeenCalled();
  });

  it('200 (RF-5): reemplazo de un item pdf existente NO cuenta contra el límite', async () => {
    process.env.MAX_PDF_ITEMS_PER_QR = '2';
    const { controller, mocks } = createController();
    mocks.getQrUseCase.execute.mockResolvedValue(
      makeQr('list', {
        data: {
          typeQr: 'list',
          urlList: [
            { itemId: 'pdf-1', typeUrl: 'pdf', documentUrl: 'https://x.cl/1.pdf' },
            { itemId: 'pdf-2', typeUrl: 'pdf', documentUrl: 'https://x.cl/2.pdf' },
          ],
        },
      }),
    );
    mocks.pdfSanitizer.sanitize.mockResolvedValue({ buffer: Buffer.from('s'), size: 1 });
    mocks.storageService.uploadPdf.mockResolvedValue({ publicUrl: PDF_URL, key: 'k', size: 1 });

    const result = await controller.uploadListPdf(makePdfFile(), 'uuid', 'pdf-2', makeUser(), tracking);
    expect(result.documentUrl).toBe(PDF_URL);
  });

  it('422: propaga el error de gs y NO sube a R2 ni persiste', async () => {
    const { controller, mocks } = createController();
    mocks.getQrUseCase.execute.mockResolvedValue(makeQr('list', { data: { typeQr: 'list', urlList: [] } }));
    mocks.pdfSanitizer.sanitize.mockRejectedValue(new UnprocessableEntityException('corrupto'));

    await expect(
      controller.uploadListPdf(makePdfFile(), 'uuid', 'item-1', makeUser(), tracking),
    ).rejects.toThrow(UnprocessableEntityException);
    expect(mocks.storageService.uploadPdf).not.toHaveBeenCalled();
    expect(mocks.updateQrUseCase.execute).not.toHaveBeenCalled();
  });
});

describe('QrController — PATCH /qr/:id con items PDF (SPEC-005 RF-15/RF-16)', () => {
  it('RF-15: elimina un item PDF del urlList → borra el objeto R2 correspondiente', async () => {
    const { controller, mocks } = createController();
    mocks.getQrUseCase.execute.mockResolvedValue(
      makeQr('list', {
        data: {
          typeQr: 'list',
          urlList: [
            { itemId: 'pdf-1', typeUrl: 'pdf', documentUrl: 'https://x.cl/qr-multilink-pdf/uuid-pdf-1.pdf' },
            { itemId: 'web-1', typeUrl: 'web', url: 'https://a.cl' },
          ],
        },
      }),
    );

    const dto = { data: { typeQr: 'list' as const, urlList: [{ itemId: 'web-1', typeUrl: 'web', url: 'https://a.cl' }] } };
    await controller.update('uuid', dto as any, makeUser(), tracking);

    expect(mocks.storageService.deleteObject).toHaveBeenCalledWith('https://x.cl/qr-multilink-pdf/uuid-pdf-1.pdf');
    expect(mocks.updateQrUseCase.execute).toHaveBeenCalledWith('uuid', dto, tracking);
  });

  it('RF-16: reemplaza documentUrl para el mismo itemId → borra el objeto anterior', async () => {
    const { controller, mocks } = createController();
    mocks.getQrUseCase.execute.mockResolvedValue(
      makeQr('list', {
        data: {
          typeQr: 'list',
          urlList: [{ itemId: 'pdf-1', typeUrl: 'pdf', documentUrl: 'https://x.cl/old.pdf' }],
        },
      }),
    );

    const dto = {
      data: {
        typeQr: 'list' as const,
        urlList: [{ itemId: 'pdf-1', typeUrl: 'pdf', documentUrl: 'https://x.cl/new.pdf' }],
      },
    };
    await controller.update('uuid', dto as any, makeUser(), tracking);

    expect(mocks.storageService.deleteObject).toHaveBeenCalledWith('https://x.cl/old.pdf');
    expect(mocks.storageService.deleteObject).toHaveBeenCalledTimes(1);
  });

  it('NO borra nada si documentUrl no cambia para el mismo itemId', async () => {
    const { controller, mocks } = createController();
    mocks.getQrUseCase.execute.mockResolvedValue(
      makeQr('list', {
        data: {
          typeQr: 'list',
          urlList: [{ itemId: 'pdf-1', typeUrl: 'pdf', documentUrl: 'https://x.cl/same.pdf' }],
        },
      }),
    );

    const dto = {
      data: {
        typeQr: 'list' as const,
        urlList: [{ itemId: 'pdf-1', typeUrl: 'pdf', documentUrl: 'https://x.cl/same.pdf' }],
      },
    };
    await controller.update('uuid', dto as any, makeUser(), tracking);

    expect(mocks.storageService.deleteObject).not.toHaveBeenCalled();
  });

  it('RF-15/RF-16: si deleteObject falla NO aborta el PATCH (mejor esfuerzo)', async () => {
    const { controller, mocks } = createController();
    mocks.getQrUseCase.execute.mockResolvedValue(
      makeQr('list', {
        data: {
          typeQr: 'list',
          urlList: [{ itemId: 'pdf-1', typeUrl: 'pdf', documentUrl: 'https://x.cl/old.pdf' }],
        },
      }),
    );
    mocks.storageService.deleteObject.mockRejectedValue(new Error('R2 caído'));

    const dto = { data: { typeQr: 'list' as const, urlList: [] } };
    await expect(controller.update('uuid', dto as any, makeUser(), tracking)).resolves.toBeUndefined();
    expect(mocks.updateQrUseCase.execute).toHaveBeenCalledWith('uuid', dto, tracking);
  });

  it('RF-16: si deleteObject falla al REEMPLAZAR documentUrl del mismo itemId NO aborta el PATCH', async () => {
    const { controller, mocks } = createController();
    mocks.getQrUseCase.execute.mockResolvedValue(
      makeQr('list', {
        data: {
          typeQr: 'list',
          urlList: [{ itemId: 'pdf-1', typeUrl: 'pdf', documentUrl: 'https://x.cl/old.pdf' }],
        },
      }),
    );
    mocks.storageService.deleteObject.mockRejectedValue(new Error('R2 caído'));

    const dto = {
      data: {
        typeQr: 'list' as const,
        urlList: [{ itemId: 'pdf-1', typeUrl: 'pdf', documentUrl: 'https://x.cl/new.pdf' }],
      },
    };
    await expect(controller.update('uuid', dto as any, makeUser(), tracking)).resolves.toBeUndefined();
    expect(mocks.storageService.deleteObject).toHaveBeenCalledWith('https://x.cl/old.pdf');
    expect(mocks.storageService.deleteObject).toHaveBeenCalledTimes(1);
    expect(mocks.traceService.warn).toHaveBeenCalledWith(
      tracking,
      'CONTROLLER',
      'PATCH /qr/:id - pdf delete failed',
      expect.objectContaining({ oldUrl: 'https://x.cl/old.pdf' }),
    );
    expect(mocks.updateQrUseCase.execute).toHaveBeenCalledWith('uuid', dto, tracking);
  });

  it('no procesa items PDF si el QR actual NO es de tipo list', async () => {
    const { controller, mocks } = createController();
    mocks.getQrUseCase.execute.mockResolvedValue(
      makeQr('dynamic', { data: { typeQr: 'dynamic', url: 'https://a.cl' } }),
    );

    const dto = { data: { typeQr: 'dynamic' as const, url: 'https://a.cl', urlList: [] } };
    await controller.update('uuid', dto as any, makeUser(), tracking);

    expect(mocks.storageService.deleteObject).not.toHaveBeenCalled();
  });
});

// ── SPEC-008 H5 (R5/R6): paginación tipada con DTOs en query ──────────────────
describe('QrController — @Query() tipado con DTOs (SPEC-008 H5 — R6)', () => {
  // El helper createController solo expone en mocks lo que se pasa por overrides
  function createControllerWithUseCases() {
    return createController({
      getAllQrUseCase: { execute: jest.fn() },
      getFavoritesQrsUseCase: { execute: jest.fn() },
      getPaginatedQrsByUserUseCase: { execute: jest.fn() },
    });
  }

  describe('findAll (GET /qr)', () => {
    it('pasa page/limit/search al use-case con defaults cuando el query está vacío', async () => {
      const { controller, mocks } = createControllerWithUseCases();

      await controller.findAll({} as any, tracking);

      expect(mocks.getAllQrUseCase.execute).toHaveBeenCalledWith(1, 10, '', tracking);
    });

    it('pasa page/limit/search tipados desde el DTO', async () => {
      const { controller, mocks } = createControllerWithUseCases();

      await controller.findAll({ page: 2, limit: 50, search: 'hola' } as any, tracking);

      expect(mocks.getAllQrUseCase.execute).toHaveBeenCalledWith(2, 50, 'hola', tracking);
    });
  });

  describe('findUserByFavorites (GET /qr/user/favorites)', () => {
    it('usa el userId del usuario logueado para rol user', async () => {
      const { controller, mocks } = createControllerWithUseCases();

      await controller.findUserByFavorites(
        { page: 1, limit: 10, search: '', userId: 'otro-user' } as any,
        makeUser('user'),
        tracking,
      );

      expect(mocks.getFavoritesQrsUseCase.execute).toHaveBeenCalledWith(
        'user-1', // userId del usuario actual
        1,
        10,
        '',
        'user',
        'user-1', // targetUserId = usuario actual (no admin)
        tracking,
      );
    });

    it('usa query.userId como target para rol admin (SPEC-008 H5 — R5)', async () => {
      const { controller, mocks } = createControllerWithUseCases();

      await controller.findUserByFavorites(
        { page: 3, limit: 25, search: 'rex', userId: 'target-id-1' } as any,
        makeUser('admin'),
        tracking,
      );

      expect(mocks.getFavoritesQrsUseCase.execute).toHaveBeenCalledWith(
        'user-1',
        3,
        25,
        'rex',
        'admin',
        'target-id-1',
        tracking,
      );
    });
  });

  describe('findPaginatedByUser (GET /qr/user/:userId/paginated)', () => {
    it('pasa page/limit/search desde el DTO', async () => {
      const { controller, mocks } = createControllerWithUseCases();

      await controller.findPaginatedByUser(
        'user-1',
        { page: 2, limit: 20, search: 'abc' } as any,
        makeUser('user'),
        tracking,
      );

      expect(mocks.getPaginatedQrsByUserUseCase.execute).toHaveBeenCalledWith(
        'user-1',
        2,
        20,
        'abc',
        tracking,
      );
    });

    it('usa defaults (1/10/“”) cuando el query está vacío', async () => {
      const { controller, mocks } = createControllerWithUseCases();

      await controller.findPaginatedByUser(
        'user-1',
        {} as any,
        makeUser('user'),
        tracking,
      );

      expect(mocks.getPaginatedQrsByUserUseCase.execute).toHaveBeenCalledWith(
        'user-1',
        1,
        10,
        '',
        tracking,
      );
    });

    it('rechaza (403) cuando un usuario no-admin pide QRs de otro usuario', async () => {
      const { controller, mocks } = createControllerWithUseCases();

      await expect(
        controller.findPaginatedByUser('otro-user', {} as any, makeUser('user'), tracking),
      ).rejects.toThrow(ForbiddenException);
      expect(mocks.getPaginatedQrsByUserUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('deactivate (POST /qr/admin/:id/deactivate — SPEC-014)', () => {
    it('CA-01: desactiva con motivo y pasa adminId al usecase', async () => {
      const { controller, mocks } = createController({
        deactivateQrUseCase: { execute: jest.fn().mockResolvedValue({ success: true }) },
      });

      await controller.deactivate(
        '507f1f77bcf86cd799439011',
        { reason: 'Cliente no renovó el plan' } as any,
        makeUser('admin'),
        tracking,
      );

      expect(mocks.deactivateQrUseCase.execute).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        'Cliente no renovó el plan',
        'user-1',
        tracking,
      );
    });

    it('acepta idQr UUID (no ObjectId) — el QR se busca por idQr, no por _id', async () => {
      const { controller, mocks } = createController({
        deactivateQrUseCase: { execute: jest.fn().mockResolvedValue({ success: true }) },
      });

      // El fix de SPEC-014: NO validar ObjectId (el idQr es UUID v4).
      await controller.deactivate(
        'b25332b3-3e1e-4b51-a84c-37ae825ad604',
        { reason: 'Motivo de prueba' } as any,
        makeUser('admin'),
        tracking,
      );

      expect(mocks.deactivateQrUseCase.execute).toHaveBeenCalledWith(
        'b25332b3-3e1e-4b51-a84c-37ae825ad604',
        'Motivo de prueba',
        'user-1',
        tracking,
      );
    });
  });
});
