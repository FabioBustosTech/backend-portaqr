import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { HttpException } from '@nestjs/common';
import { MongoPetTagRepository } from './mongo-pet-tag.repository';
import { PetTagSchema, PetTagDocument } from './schemas/pet-tag.schema';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import type { PetData } from '../../../domain/entities/pet-tag.entity';

const mockSave = jest.fn();
const mockFind = jest.fn();
const mockFindOne = jest.fn();
const mockFindOneAndUpdate = jest.fn();
let mockUpdateOne = jest.fn(); // SPEC-009 A12: contador de intentos de activación
const mockCountDocuments = jest.fn();
const mockInsertMany = jest.fn();

const modelMock = jest.fn().mockImplementation((data: Record<string, unknown>) => ({
  ...data,
  save: mockSave,
})) as unknown as Model<PetTagDocument>;

(modelMock as unknown as Record<string, unknown>).find = mockFind;
(modelMock as unknown as Record<string, unknown>).findOne = mockFindOne;
(modelMock as unknown as Record<string, unknown>).findOneAndUpdate = mockFindOneAndUpdate;
(modelMock as unknown as Record<string, unknown>).updateOne = mockUpdateOne;
(modelMock as unknown as Record<string, unknown>).countDocuments = mockCountDocuments;
(modelMock as unknown as Record<string, unknown>).insertMany = mockInsertMany;

/** Recolecta todos los valores $regex de un query Mongo (SPEC-008 H3 â€” verificaciÃ³n anti-ReDoS). */
function collectRegexValues(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) {
    for (const item of node) collectRegexValues(item, out);
  } else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (key === '$regex') out.push(String(value));
      else collectRegexValues(value, out);
    }
  }
  return out;
}

describe('MongoPetTagRepository', () => {
  let repository: MongoPetTagRepository;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };
  const VALID_USER_ID = '507f1f77bcf86cd799439011';

  const petData: PetData = {
    ownerName: 'Juan',
    address: 'Calle 1',
    phone: '123456789',
    petName: 'Rex',
    breed: 'Labrador',
  };

  const buildFindChain = (result: unknown) => ({
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongoPetTagRepository,
        {
          provide: getModelToken(PetTagSchema.name),
          useValue: modelMock,
        },
        {
          provide: TraceService,
          useValue: {
            log: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get(MongoPetTagRepository);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(repository).toBeDefined();
  });

  describe('generateBatch', () => {
    /** Construye documentos insertados como devuelve insertMany (sin _id, valores planos) */
    const buildInsertedDocs = (quantity: number, storeName: string | null = null) =>
      Array.from({ length: quantity }, (_, i) => ({
        idQr: `uuid-${i}`,
        activationPin: `PIN${i}`,
        status: 'RESERVADO',
        commercialStatus: storeName ? 'ASIGNADO_COMERCIO' : 'EN_BODEGA',
        assignedStoreName: storeName,
      }));

    it('debe generar un lote de placas en 1 sola operaciÃ³n insertMany sin tienda asignada', async () => {
      const inserted = buildInsertedDocs(2);
      mockInsertMany.mockResolvedValue(inserted);

      const result = await repository.generateBatch(2, '', tracking);

      expect(mockInsertMany).toHaveBeenCalledTimes(1);
      const docsArg = mockInsertMany.mock.calls[0][0] as Array<Record<string, unknown>>;
      expect(docsArg).toHaveLength(2);
      expect(docsArg[0]).toEqual(
        expect.objectContaining({
          status: 'RESERVADO',
          commercialStatus: 'EN_BODEGA',
          assignedStoreName: null,
        }),
      );
      expect(mockSave).not.toHaveBeenCalled();
      expect(modelMock).not.toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        qrId: expect.any(String),
        activationPin: expect.any(String),
        assignedStoreName: null,
      });
      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'generateBatch:complete',
        { total: 2 },
      );
    });

    it('debe generar un lote de placas con tienda asignada', async () => {
      const inserted = buildInsertedDocs(1, 'Tienda Central');
      mockInsertMany.mockResolvedValue(inserted);

      const result = await repository.generateBatch(1, 'Tienda Central', tracking);

      const docsArg = mockInsertMany.mock.calls[0][0] as Array<Record<string, unknown>>;
      expect(docsArg[0]).toEqual(
        expect.objectContaining({
          commercialStatus: 'ASIGNADO_COMERCIO',
          assignedStoreName: 'Tienda Central',
        }),
      );
      expect(result[0].assignedStoreName).toBe('Tienda Central');
    });

    it('debe generar ids Ãºnicos (uuid) y pins Ãºnicos (nanoid) por cada placa', async () => {
      const inserted = buildInsertedDocs(3);
      mockInsertMany.mockResolvedValue(inserted);

      const result = await repository.generateBatch(3, '', tracking);

      const docsArg = mockInsertMany.mock.calls[0][0] as Array<Record<string, unknown>>;
      const ids = docsArg.map((d) => d.idQr);
      const pins = docsArg.map((d) => d.activationPin);
      expect(new Set(ids).size).toBe(3);
      expect(new Set(pins).size).toBe(3);
      expect(result).toHaveLength(3);
    });

    it('debe trazar y lanzar HttpException si el guardado falla', async () => {
      mockInsertMany.mockRejectedValue(new Error('DB down'));

      await expect(repository.generateBatch(2, '', tracking)).rejects.toThrow(HttpException);
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'generateBatch:error',
        expect.any(Error),
      );
    });
  });

  describe('findReserved', () => {
    const results = [
      {
        _id: { toString: () => 'tag-1' },
        idQr: 'qr-1',
        activationPin: 'ABC123',
        createdAt: new Date('2024-01-01'),
        status: 'RESERVADO',
        commercialStatus: 'EN_BODEGA',
        assignedStoreName: null,
      },
    ];

    it('debe retornar datos paginados con filtros por defecto', async () => {
      mockFind.mockReturnValue(buildFindChain(results));
      mockCountDocuments.mockResolvedValue(1);

      const result = await repository.findReserved({}, tracking);

      expect(mockFind).toHaveBeenCalledWith({});
      expect(mockCountDocuments).toHaveBeenCalledWith({});
      expect(result).toEqual({
        // El repository mapea con PetTagMongoMapper.toEntity (id string desde _id)
        data: [
          {
            id: 'tag-1',
            name: undefined,
            idQr: 'qr-1',
            userId: null,
            activationPin: 'ABC123',
            status: 'RESERVADO',
            petData: null,
            expiration: undefined,
            commercialStatus: 'EN_BODEGA',
            isFavorite: undefined,
            assignedStoreName: null,
            createdAt: new Date('2024-01-01'),
            updatedAt: undefined,
          },
        ],
        pagination: { total: 1, page: 1, limit: 100, totalPages: 1 },
      });
    });

    it('debe construir el filtro con status, commercialStatus, storeName y search', async () => {
      mockFind.mockReturnValue(buildFindChain(results));
      mockCountDocuments.mockResolvedValue(1);

      await repository.findReserved(
        {
          page: 2,
          limit: 10,
          status: 'RESERVADO',
          commercialStatus: 'EN_BODEGA',
          storeName: 'Tienda',
          search: 'rex',
        },
        tracking,
      );

      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'RESERVADO',
          commercialStatus: 'EN_BODEGA',
          assignedStoreName: { $regex: 'Tienda', $options: 'i' },
          $or: expect.any(Array),
        }),
      );
    });

    it('debe escapar metacaracteres de search y storeName (SPEC-008 H3 â€” R2 ReDoS, CA-02)', async () => {
      mockFind.mockReturnValue(buildFindChain(results));
      mockCountDocuments.mockResolvedValue(1);

      // (a+)+$ con backtracking exponencial â†’ debe llegar a $regex como literal
      await repository.findReserved(
        { storeName: '(a+)+$', search: '.*' },
        tracking,
      );

      const escapedStore = '\\(a\\+\\)\\+\\$';
      const escapedSearch = '\\.\\*';
      const findCall = mockFind.mock.calls[0][0];

      expect(findCall.assignedStoreName).toEqual({
        $regex: escapedStore,
        $options: 'i',
      });
      // Todos los $regex del $or usan el tÃ©rmino escapado (nunca '.*' crudo)
      const regexValues = collectRegexValues(findCall.$or);
      expect(regexValues.length).toBeGreaterThan(0);
      expect(regexValues).not.toContain('.*');
      expect(regexValues.every((v) => v === escapedSearch)).toBe(true);
    });

    it('debe construir el filtro de fechas con startDate y endDate', async () => {
      mockFind.mockReturnValue(buildFindChain(results));
      mockCountDocuments.mockResolvedValue(1);

      await repository.findReserved(
        { startDate: '2024-01-01', endDate: '2024-12-31' },
        tracking,
      );

      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: {
            $gte: new Date('2024-01-01'),
            $lte: new Date('2024-12-31'),
          },
        }),
      );
    });

    it('debe construir el filtro de fecha solo con endDate', async () => {
      mockFind.mockReturnValue(buildFindChain(results));
      mockCountDocuments.mockResolvedValue(1);

      await repository.findReserved({ endDate: '2024-12-31' }, tracking);

      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: { $lte: new Date('2024-12-31') },
        }),
      );
    });

    it('debe calcular totalPages correctamente', async () => {
      mockFind.mockReturnValue(buildFindChain(results));
      mockCountDocuments.mockResolvedValue(25);

      const result = await repository.findReserved({ page: 1, limit: 10 }, tracking);

      expect(result.pagination.totalPages).toBe(3);
    });

    it('debe trazar y lanzar HttpException si la consulta falla', async () => {
      mockFind.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error('DB down')),
      });

      await expect(repository.findReserved({}, tracking)).rejects.toThrow(HttpException);
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'findReserved:error',
        expect.any(Error),
      );
    });
  });

  describe('getStatus', () => {
    it('debe retornar el estado y petData cuando encuentra la placa', async () => {
      const tag = { status: 'ACTIVO', petData };
      mockFindOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(tag),
      });

      const result = await repository.getStatus('qr-1', tracking);

      expect(mockFindOne).toHaveBeenCalledWith({ idQr: 'qr-1' });
      expect(result).toEqual(tag);
    });

    it('debe retornar null cuando no encuentra la placa', async () => {
      mockFindOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.getStatus('qr-inexistente', tracking);

      expect(result).toBeNull();
    });

    it('debe trazar y lanzar HttpException si la consulta falla', async () => {
      mockFindOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error('DB down')),
      });

      await expect(repository.getStatus('qr-1', tracking)).rejects.toThrow(HttpException);
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getStatus:error',
        expect.any(Error),
      );
    });
  });

  describe('update', () => {
    it('debe actualizar la placa en 1 findOneAndUpdate con los campos enviados', async () => {
      const updatedTag = {
        idQr: 'qr-1',
        petData,
        name: 'Nuevo',
        isFavorite: true,
        commercialStatus: 'VENDIDO',
      };
      mockFindOneAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue(updatedTag) });

      const result = await repository.update(
        'qr-1',
        VALID_USER_ID,
        { petData, name: 'Nuevo', isFavorite: true, commercialStatus: 'VENDIDO' },
        tracking,
      );

      expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(1);
      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { idQr: 'qr-1', userId: expect.anything() },
        {
          $set: {
            petData,
            name: 'Nuevo',
            isFavorite: true,
            commercialStatus: 'VENDIDO',
          },
        },
        { new: true, runValidators: true },
      );
      expect(mockFindOne).not.toHaveBeenCalled();
      expect(mockSave).not.toHaveBeenCalled();
      expect(result).toEqual(updatedTag);
    });

    it('debe conservar los valores existentes cuando no se envÃ­an campos (solo campos presentes en $set)', async () => {
      const updatedTag = {
        idQr: 'qr-1',
        petData,
        name: 'Rex',
        isFavorite: true,
        commercialStatus: 'VENDIDO',
      };
      mockFindOneAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue(updatedTag) });

      const result = await repository.update('qr-1', VALID_USER_ID, {}, tracking);

      const updateCall = mockFindOneAndUpdate.mock.calls[0][1] as {
        $set: Record<string, unknown>;
      };
      // petData undefined no debe incluirse en el $set (Mongoose lo ignora)
      expect(updateCall.$set).toEqual({ petData: undefined });
      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { idQr: 'qr-1', userId: expect.anything() },
        expect.objectContaining({ $set: expect.any(Object) }),
        { new: true, runValidators: true },
      );
      expect(result).toEqual(updatedTag);
    });

    it('debe lanzar error cuando la placa no existe o no pertenece al usuario', async () => {
      mockFindOneAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

      await expect(
        repository.update('qr-1', VALID_USER_ID, {}, tracking),
      ).rejects.toThrow('Placa no encontrada o no pertenece a este usuario.');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'update:error',
        expect.any(Error),
      );
    });

  it('debe trazar y lanzar HttpException si la consulta falla', async () => {
    mockFindOneAndUpdate.mockReturnValue({
      lean: jest.fn().mockRejectedValue(new Error('DB down')),
    });

    await expect(
      repository.update('qr-1', VALID_USER_ID, {}, tracking),
    ).rejects.toThrow(HttpException);
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'update:error',
        expect.any(Error),
      );
    });
  });

  describe('setPetImageUrl (SPEC-016)', () => {
    it('debe persistir la URL en el sub-campo petData.petImageUrl sin pisar el resto del petData', async () => {
      const updatedTag = {
        idQr: 'qr-1',
        petData: { ...petData, petImageUrl: 'https://cdn/pet-tag/qr-1.webp' },
      };
      mockFindOneAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue(updatedTag) });

      const result = await repository.setPetImageUrl(
        'qr-1',
        VALID_USER_ID,
        'https://cdn/pet-tag/qr-1.webp',
        tracking,
      );

      expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(1);
      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { idQr: 'qr-1', userId: expect.anything() },
        { $set: { 'petData.petImageUrl': 'https://cdn/pet-tag/qr-1.webp' } },
        { new: true, runValidators: true },
      );
      expect(result).toEqual(updatedTag);
    });

    it('debe aceptar url null para limpiar la foto (borrado)', async () => {
      const updatedTag = { idQr: 'qr-1', petData: { petName: 'Rex', petImageUrl: null } };
      mockFindOneAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue(updatedTag) });

      const result = await repository.setPetImageUrl('qr-1', VALID_USER_ID, null, tracking);

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { idQr: 'qr-1', userId: expect.anything() },
        { $set: { 'petData.petImageUrl': null } },
        { new: true, runValidators: true },
      );
      expect(result).toEqual(updatedTag);
    });

    it('debe filtrar solo por idQr cuando userId es null (admin sobre placa ajena)', async () => {
      const updatedTag = { idQr: 'qr-1', petData: { petName: 'Rex', petImageUrl: 'https://cdn/x.webp' } };
      mockFindOneAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue(updatedTag) });

      await repository.setPetImageUrl('qr-1', null, 'https://cdn/x.webp', tracking);

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { idQr: 'qr-1' },
        { $set: { 'petData.petImageUrl': 'https://cdn/x.webp' } },
        { new: true, runValidators: true },
      );
    });

    it('debe lanzar error cuando la placa no existe o no pertenece al usuario', async () => {
      mockFindOneAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

      await expect(
        repository.setPetImageUrl('qr-1', VALID_USER_ID, 'https://cdn/x.webp', tracking),
      ).rejects.toThrow('Placa no encontrada o no pertenece a este usuario.');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'setPetImageUrl:error',
        expect.any(Error),
      );
    });

    it('debe trazar y lanzar HttpException si la consulta falla', async () => {
      mockFindOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('DB down')),
      });

      await expect(
        repository.setPetImageUrl('qr-1', VALID_USER_ID, 'https://cdn/x.webp', tracking),
      ).rejects.toThrow(HttpException);
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'setPetImageUrl:error',
        expect.any(Error),
      );
    });

    it('caso borde petData null: traduce Path collision a 422 (placa sin datos de mascota)', async () => {
      mockFindOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('Path collision at petData.petImageUrl')),
      });

      await expect(
        repository.setPetImageUrl('qr-1', VALID_USER_ID, 'https://cdn/x.webp', tracking),
      ).rejects.toThrow(HttpException);
      // El 422 es un HttpException con UNPROCESSABLE_ENTITY
      await expect(
        repository.setPetImageUrl('qr-1', VALID_USER_ID, 'https://cdn/x.webp', tracking),
      ).rejects.toMatchObject({ status: 422 });
    });
  });

  describe('getOwner (SPEC-016)', () => {
    it('debe retornar el userId del dueño de la placa', async () => {
      mockFindOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest
            .fn()
            .mockResolvedValue({ userId: new Types.ObjectId('507f1f77bcf86cd799439011') }),
        }),
      });

      const result = await repository.getOwner('qr-1', tracking);

      expect(mockFindOne).toHaveBeenCalledWith({ idQr: 'qr-1' });
      expect(result).toEqual({ userId: '507f1f77bcf86cd799439011' });
    });

    it('debe retornar userId null cuando la placa no tiene dueño', async () => {
      mockFindOne.mockReturnValue({
        select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ userId: null }) }),
      });

      const result = await repository.getOwner('qr-1', tracking);

      expect(result).toEqual({ userId: null });
    });

    it('debe retornar null cuando la placa no existe', async () => {
      mockFindOne.mockReturnValue({
        select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
      });

      const result = await repository.getOwner('qr-1', tracking);

      expect(result).toBeNull();
    });
  });

describe('activate', () => {
  const VALID_USER_ID = new Types.ObjectId().toString();
  const petData = { ownerName: 'Juan', address: 'Calle 1', phone: '123', petName: 'Rex' } as PetData;
  const updatedTag = { idQr: 'qr-1', status: 'ACTIVO' };
  const existing = { idQr: 'qr-1', activationPin: 'PIN-1', status: 'ACTIVO' };
  const reservada = { idQr: 'qr-1', activationPin: 'PIN-1', status: 'RESERVADO' };
  const activatedByOther = { idQr: 'qr-1', activationPin: 'PIN-1', status: 'ACTIVO', userId: 'other' };

  /** Query chainable con select+lean+exec (el check de bloqueo usa findOne().select().lean().exec()) */
  function mockQueryChain(execResult: unknown) {
    return {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(execResult),
    };
  }

  it('debe activar la placa en 1 findOneAndUpdate atómico (filtro condicional) y retornar el documento', async () => {
    mockFindOne.mockReturnValue(mockQueryChain(null)); // check de bloqueo: no bloqueada
    mockFindOneAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue(updatedTag) });

    const result = await repository.activate('qr-1', 'PIN-1', petData, VALID_USER_ID, tracking);

    expect(mockFindOne).toHaveBeenCalledTimes(1); // solo el check de bloqueo
    expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { idQr: 'qr-1', activationPin: 'PIN-1', status: 'RESERVADO' },
      {
        $set: expect.objectContaining({
          status: 'ACTIVO',
          userId: expect.anything(),
          petData,
          expiration: expect.any(Date),
          commercialStatus: 'VENDIDO',
          activationAttempts: 0,
          activationLockedUntil: null,
        }),
      },
      expect.anything(),
    );
    expect(result).toEqual(updatedTag);
  });

  it('SPEC-009 A12: lanza 429 si la placa está bloqueada temporalmente (5 PINs fallidos)', async () => {
    mockFindOne.mockReturnValue(mockQueryChain({ _id: 'x' })); // lockedUntil en el futuro
    mockFindOneAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

    await expect(
      repository.activate('qr-1', 'PIN-1', petData, VALID_USER_ID, tracking),
    ).rejects.toThrow('Demasiados intentos de activación');
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('debe lanzar error cuando no encuentra la placa (diagnóstico 404 en rama de error)', async () => {
    mockFindOne.mockReset();
    mockFindOne
      .mockReturnValueOnce(mockQueryChain(null)) // check de bloqueo
      .mockReturnValueOnce(mockQueryChain(null)); // diagnóstico: placa no existe
    mockFindOneAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

    await expect(
      repository.activate('qr-1', 'PIN-1', petData, VALID_USER_ID, tracking),
    ).rejects.toThrow('No se encontró una placa con ID QR: qr-1');
    expect(mockFindOne).toHaveBeenCalledTimes(2);
    expect(mockFindOne).toHaveBeenLastCalledWith({ idQr: 'qr-1' });
  });

  it('debe lanzar 409 cuando la placa ya está activa (existe pero no RESERVADO)', async () => {
    mockFindOne
      .mockReturnValueOnce(mockQueryChain(null)) // check de bloqueo
      .mockReturnValueOnce(mockQueryChain(existing)); // diagnóstico: ya activa
    mockFindOneAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

    await expect(
      repository.activate('qr-1', 'PIN-1', petData, VALID_USER_ID, tracking),
    ).rejects.toThrow('ya está activa');
  });

  it('debe lanzar 409 cuando otra request concurrente activó la placa (TOCTOU eliminado)', async () => {
    mockFindOne
      .mockReturnValueOnce(mockQueryChain(null)) // check de bloqueo
      .mockReturnValueOnce(mockQueryChain(activatedByOther)); // diagnóstico: activa por otro
    mockFindOneAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

    await expect(
      repository.activate('qr-1', 'PIN-1', petData, VALID_USER_ID, tracking),
    ).rejects.toThrow('ya está activa');
  });

  it('SPEC-009 A12: PIN incorrecto → 400 y se incrementa el contador de intentos', async () => {
    mockFindOne.mockReset();
    mockFindOne
      .mockReturnValueOnce(mockQueryChain(null)) // check de bloqueo
      .mockReturnValueOnce(mockQueryChain({ ...reservada, activationAttempts: 2 })); // PIN incorrecto
    mockFindOneAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    mockUpdateOne.mockReset();
    mockUpdateOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });

    await expect(
      repository.activate('qr-1', 'PIN-ERR', petData, VALID_USER_ID, tracking),
    ).rejects.toThrow('PIN de activación incorrecto');
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { idQr: 'qr-1' },
      { $set: { activationAttempts: 3 } },
    );
  });

  it('SPEC-009 A12: 5º fallo → bloquea la placa 30 min y responde 429', async () => {
    mockFindOne.mockReset();
    mockFindOne
      .mockReturnValueOnce(mockQueryChain(null)) // check de bloqueo
      .mockReturnValueOnce(mockQueryChain({ ...reservada, activationAttempts: 4 })); // 5º fallo
    mockFindOneAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    mockUpdateOne.mockReset();
    mockUpdateOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });

    await expect(
      repository.activate('qr-1', 'PIN-ERR', petData, VALID_USER_ID, tracking),
    ).rejects.toThrow('Demasiados intentos de activación');
    expect(mockUpdateOne).toHaveBeenCalledTimes(2);
  });

  it('debe trazar y lanzar el error si la consulta falla', async () => {
    mockFindOne.mockReturnValue(mockQueryChain(null)); // check de bloqueo OK
    mockFindOneAndUpdate.mockReturnValue({
      lean: jest.fn().mockRejectedValue(new Error('DB down')),
    });

    await expect(
      repository.activate('qr-1', 'PIN-1', petData, VALID_USER_ID, tracking),
    ).rejects.toThrow('DB down');
    expect(traceService.error).toHaveBeenCalledWith(
      tracking,
      TraceLayer.REPOSITORY,
      'activate:error',
      expect.any(Error),
    );
  });
});});
