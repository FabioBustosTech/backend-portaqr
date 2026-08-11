import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
const mockCountDocuments = jest.fn();
const mockInsertMany = jest.fn();

const modelMock = jest.fn().mockImplementation((data: Record<string, unknown>) => ({
  ...data,
  save: mockSave,
})) as unknown as Model<PetTagDocument>;

(modelMock as unknown as Record<string, unknown>).find = mockFind;
(modelMock as unknown as Record<string, unknown>).findOne = mockFindOne;
(modelMock as unknown as Record<string, unknown>).findOneAndUpdate = mockFindOneAndUpdate;
(modelMock as unknown as Record<string, unknown>).countDocuments = mockCountDocuments;
(modelMock as unknown as Record<string, unknown>).insertMany = mockInsertMany;

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

    it('debe generar un lote de placas en 1 sola operación insertMany sin tienda asignada', async () => {
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

    it('debe generar ids únicos (uuid) y pins únicos (nanoid) por cada placa', async () => {
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
    it('debe actualizar los campos de la placa y guardar', async () => {
      const tag = {
        petData: null,
        name: 'Viejo',
        isFavorite: false,
        commercialStatus: 'EN_BODEGA',
        save: mockSave,
      };
      mockFindOne.mockResolvedValue(tag);
      mockSave.mockResolvedValue(tag);

      const result = await repository.update(
        'qr-1',
        VALID_USER_ID,
        { petData, name: 'Nuevo', isFavorite: true, commercialStatus: 'VENDIDO' },
        tracking,
      );

      expect(mockFindOne).toHaveBeenCalledWith({
        idQr: 'qr-1',
        userId: expect.anything(),
      });
      expect(tag.petData).toEqual(petData);
      expect(tag.name).toBe('Nuevo');
      expect(tag.isFavorite).toBe(true);
      expect(tag.commercialStatus).toBe('VENDIDO');
      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(result).toBe(tag);
    });

    it('debe conservar los valores existentes cuando no se envían campos', async () => {
      const tag = {
        petData,
        name: 'Rex',
        isFavorite: true,
        commercialStatus: 'VENDIDO',
        save: mockSave,
      };
      mockFindOne.mockResolvedValue(tag);
      mockSave.mockResolvedValue(tag);

      const result = await repository.update('qr-1', VALID_USER_ID, {}, tracking);

      expect(tag.petData).toEqual(petData);
      expect(tag.name).toBe('Rex');
      expect(tag.isFavorite).toBe(true);
      expect(tag.commercialStatus).toBe('VENDIDO');
      expect(result).toBe(tag);
    });

    it('debe lanzar error cuando la placa no existe o no pertenece al usuario', async () => {
      mockFindOne.mockResolvedValue(null);

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
      mockFindOne.mockRejectedValue(new Error('DB down'));

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

  describe('activate', () => {
    it('debe activar la placa en 1 findOneAndUpdate atómico (filtro condicional) y retornar el documento', async () => {
      const updatedTag = {
        idQr: 'qr-1',
        status: 'ACTIVO',
        userId: VALID_USER_ID,
        petData,
        commercialStatus: 'VENDIDO',
      };
      mockFindOneAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue(updatedTag) });

      const result = await repository.activate(
        'qr-1',
        'PIN-1',
        petData,
        VALID_USER_ID,
        tracking,
      );

      // 1 sola llamada atómica con filtro condicional (status RESERVADO elimina TOCTOU)
      expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(1);
      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { idQr: 'qr-1', activationPin: 'PIN-1', status: 'RESERVADO' },
        {
          $set: expect.objectContaining({
            status: 'ACTIVO',
            petData,
            commercialStatus: 'VENDIDO',
            expiration: expect.any(Date),
          }),
        },
        { new: true, runValidators: true },
      );
      // Camino feliz: sin lecturas previas
      expect(mockFindOne).not.toHaveBeenCalled();
      expect(result).toEqual(updatedTag);
    });

    it('debe lanzar error cuando no encuentra la placa (diagnóstico 404 en rama de error)', async () => {
      mockFindOneAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
      mockFindOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

      await expect(
        repository.activate('qr-1', 'PIN-1', petData, VALID_USER_ID, tracking),
      ).rejects.toThrow('No se encontró una placa con ID QR: qr-1');
      // 1 write + 1 read de diagnóstico (solo en rama de error)
      expect(mockFindOne).toHaveBeenCalledTimes(1);
      expect(mockFindOne).toHaveBeenCalledWith({ idQr: 'qr-1', activationPin: 'PIN-1' });
    });

    it('debe lanzar 409 cuando la placa ya está activa (existe pero no RESERVADO)', async () => {
      const existing = { idQr: 'qr-1', activationPin: 'PIN-1', status: 'ACTIVO' };
      mockFindOneAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
      mockFindOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(existing) });

      await expect(
        repository.activate('qr-1', 'PIN-1', petData, VALID_USER_ID, tracking),
      ).rejects.toThrow('ya está activa');
    });

    it('debe lanzar 409 cuando otra request concurrente activó la placa (TOCTOU eliminado)', async () => {
      const activatedByOther = {
        idQr: 'qr-1',
        activationPin: 'PIN-1',
        status: 'ACTIVO',
      };
      mockFindOneAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
      mockFindOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(activatedByOther) });

      await expect(
        repository.activate('qr-1', 'PIN-1', petData, VALID_USER_ID, tracking),
      ).rejects.toThrow('ya está activa');
    });

    it('debe trazar y lanzar HttpException si la consulta falla', async () => {
      mockFindOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('DB down')),
      });

      await expect(
        repository.activate('qr-1', 'PIN-1', petData, VALID_USER_ID, tracking),
      ).rejects.toThrow(HttpException);
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'activate:error',
        expect.any(Error),
      );
    });
  });
});