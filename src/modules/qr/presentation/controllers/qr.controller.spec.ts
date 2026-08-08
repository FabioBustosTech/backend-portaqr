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
    storageService: { uploadImage: jest.fn(), deleteObject: jest.fn() },
    imageProcessor: { process: jest.fn() },
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
    mocks.traceService,
    mocks.storageService,
    mocks.imageProcessor,
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
