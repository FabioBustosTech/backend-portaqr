import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { HttpException } from '@nestjs/common';
import { MongoQrRepository } from './mongo-qr.repository';
import { QrSchema, QrDocument } from './schemas/qr.schema';
import {
  PetTagSchema,
  PetTagDocument,
} from 'src/modules/pet-tag/infrastructure/repository/mongo/schemas/pet-tag.schema';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import type { Qr } from '../../../domain/entities/qr.entity';

const mockSave = jest.fn();
const mockFind = jest.fn();
const mockFindOne = jest.fn();
const mockFindOneAndUpdate = jest.fn();
const mockFindOneAndDelete = jest.fn();
const mockCountDocuments = jest.fn();
const mockPetTagFind = jest.fn();
const mockPetTagCountDocuments = jest.fn();
const mockUpdateMany = jest.fn();
const mockAggregate = jest.fn();
const mockPetTagAggregate = jest.fn();

const qrModelMock = jest.fn().mockImplementation((data: Record<string, unknown>) => ({
  ...data,
  save: mockSave,
})) as unknown as Model<QrDocument>;

(qrModelMock as unknown as Record<string, unknown>).find = mockFind;
(qrModelMock as unknown as Record<string, unknown>).findOne = mockFindOne;
(qrModelMock as unknown as Record<string, unknown>).findOneAndUpdate = mockFindOneAndUpdate;
(qrModelMock as unknown as Record<string, unknown>).findOneAndDelete = mockFindOneAndDelete;
(qrModelMock as unknown as Record<string, unknown>).countDocuments = mockCountDocuments;
(qrModelMock as unknown as Record<string, unknown>).updateMany = mockUpdateMany;
(qrModelMock as unknown as Record<string, unknown>).aggregate = mockAggregate;

const petTagModelMock = jest.fn() as unknown as Model<PetTagDocument>;
(petTagModelMock as unknown as Record<string, unknown>).find = mockPetTagFind;
(petTagModelMock as unknown as Record<string, unknown>).countDocuments = mockPetTagCountDocuments;
(petTagModelMock as unknown as Record<string, unknown>).aggregate = mockPetTagAggregate;

/** Crea un mock de query encadenable (sort/limit/skip/lean/select/exec) */
const createQueryMock = (result: unknown, reject = false) => {
  const exec = reject
    ? jest.fn().mockRejectedValue(result)
    : jest.fn().mockResolvedValue(result);
  const query = {
    exec,
    sort: jest.fn(),
    limit: jest.fn(),
    skip: jest.fn(),
    lean: jest.fn(),
    select: jest.fn(),
  };
  query.sort.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.skip.mockReturnValue(query);
  query.lean.mockReturnValue(query);
  query.select.mockReturnValue(query);
  return query;
};

/** Crea un resultado de countDocuments que soporta .exec() y await directo */
const createCountResult = (value: number) => {
  const promise = Promise.resolve(value) as unknown as { exec: jest.Mock };
  promise.exec = jest.fn().mockResolvedValue(value);
  return promise;
};

/** Crea un resultado de aggregate $facet: [{ data, total }] con .exec() */
const createAggregateFacetResult = (
  data: unknown[],
  total: number,
): { exec: jest.Mock } => {
  const result = [{ data, total: [{ v: total }] }];
  return { exec: jest.fn().mockResolvedValue(result) };
};

describe('MongoQrRepository', () => {
  let repository: MongoQrRepository;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const qrDoc = {
    _id: { toString: () => 'qr-id-1' },
    idQr: 'QR-1',
    userId: 'user-1',
    expiration: new Date('2025-01-01T00:00:00.000Z'),
    quantityUpdateMonth: 2,
    description: 'QR de prueba',
    data: { typeQr: 'dynamic', url: 'https://ejemplo.cl' },
    name: 'Mi QR',
    updatedAt: new Date('2025-01-02T00:00:00.000Z'),
    active: true,
    isFavorite: false,
    isOldMode: false,
    typeQr: 'dynamic',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
  };

  const qr: Qr = {
    id: 'qr-id-1',
    idQr: 'QR-1',
    userId: 'user-1',
    expiration: qrDoc.expiration,
    quantityUpdateMonth: 2,
    description: 'QR de prueba',
    data: { typeQr: 'dynamic', url: 'https://ejemplo.cl' },
    name: 'Mi QR',
    updatedAt: qrDoc.updatedAt,
    active: true,
    isFavorite: false,
    isOldMode: false,
    typeQr: 'dynamic',
    createdAt: qrDoc.createdAt,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongoQrRepository,
        {
          provide: getModelToken(QrSchema.name),
          useValue: qrModelMock,
        },
        {
          provide: getModelToken(PetTagSchema.name),
          useValue: petTagModelMock,
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

    repository = module.get(MongoQrRepository);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('debe crear el documento con el mapper y retornar la entidad mapeada', async () => {
      mockSave.mockResolvedValue(qrDoc);

      const result = await repository.create(qr, tracking);

      expect(qrModelMock).toHaveBeenCalledWith(
        expect.objectContaining({
          idQr: 'QR-1',
          userId: 'user-1',
          typeQr: 'dynamic',
          name: 'Mi QR',
        }),
      );
      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(result).toEqual(qr);
    });

    it('debe trazar y re-lanzar el error si el guardado falla', async () => {
      mockSave.mockRejectedValue(new Error('DB down'));

      await expect(repository.create(qr, tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'create:error',
        expect.any(Error),
      );
    });
  });

  describe('getRecentActive', () => {
    it('debe retornar los QRs activos recientes mapeados', async () => {
      mockFind.mockReturnValue(createQueryMock([qrDoc]));

      const result = await repository.getRecentActive(5, tracking);

      expect(mockFind).toHaveBeenCalledWith({ active: true });
      expect(result).toEqual([qr]);
    });

    it('debe retornar un arreglo vacío cuando no hay QRs activos', async () => {
      mockFind.mockReturnValue(createQueryMock([]));

      const result = await repository.getRecentActive(5, tracking);

      expect(result).toEqual([]);
    });

    it('debe trazar y re-lanzar el error si la consulta falla', async () => {
      mockFind.mockReturnValue(createQueryMock(new Error('DB down'), true));

      await expect(repository.getRecentActive(5, tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getRecentActive:error',
        expect.any(Error),
      );
    });
  });

  describe('getAll', () => {
    it('debe retornar todos los QRs mapeados', async () => {
      mockFind.mockReturnValue(createQueryMock([qrDoc]));

      const result = await repository.getAll(tracking);

      expect(mockFind).toHaveBeenCalledWith();
      expect(result).toEqual([qr]);
    });

    it('debe trazar y re-lanzar el error si la consulta falla', async () => {
      mockFind.mockReturnValue(createQueryMock(new Error('DB down'), true));

      await expect(repository.getAll(tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getAll:error',
        expect.any(Error),
      );
    });
  });

  describe('findAllWithSearch', () => {
    it('debe retornar datos y paginación sin búsqueda (query vacía)', async () => {
      mockFind.mockReturnValue(createQueryMock([qrDoc]));
      mockCountDocuments.mockReturnValue(createCountResult(1));

      const result = await repository.findAllWithSearch(1, 10, '', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'findAllWithSearch:init',
        { page: 1, limit: 10, search: '' },
      );
      expect(mockFind).toHaveBeenCalledWith({});
      expect(mockCountDocuments).toHaveBeenCalledWith({});
      expect(result).toEqual({
        data: [qr],
        pagination: {
          total: 1,
          totalPages: 1,
          currentPage: 1,
          limit: 10,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });
    });

    it('debe construir la query de búsqueda y calcular la paginación correctamente', async () => {
      mockFind.mockReturnValue(createQueryMock([qrDoc]));
      mockCountDocuments.mockReturnValue(createCountResult(25));

      const result = await repository.findAllWithSearch(2, 10, 'hola', tracking);

      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({ $or: expect.any(Array) }),
      );
      expect(mockCountDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ $or: expect.any(Array) }),
      );
      expect(result.pagination).toEqual({
        total: 25,
        totalPages: 3,
        currentPage: 2,
        limit: 10,
        hasNextPage: true,
        hasPrevPage: true,
      });
    });

    it('debe usar los valores por defecto (page=1, limit=10, search="")', async () => {
      mockFind.mockReturnValue(createQueryMock([qrDoc]));
      mockCountDocuments.mockReturnValue(createCountResult(1));

      const result = await repository.findAllWithSearch(undefined, undefined, undefined, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'findAllWithSearch:init',
        { page: 1, limit: 10, search: '' },
      );
      expect(result.pagination).toEqual({
        total: 1,
        totalPages: 1,
        currentPage: 1,
        limit: 10,
        hasNextPage: false,
        hasPrevPage: false,
      });
    });

    it('debe trazar y re-lanzar el error si la consulta falla', async () => {
      mockFind.mockReturnValue(createQueryMock(new Error('DB down'), true));

      await expect(
        repository.findAllWithSearch(1, 10, '', tracking),
      ).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'findAllWithSearch:error',
        expect.any(Error),
      );
    });
  });

  describe('getById', () => {
    it('debe retornar la entidad mapeada cuando encuentra el QR', async () => {
      mockFindOne.mockReturnValue(createQueryMock(qrDoc));

      const result = await repository.getById('QR-1', tracking);

      expect(mockFindOne).toHaveBeenCalledWith({ idQr: 'QR-1' });
      expect(result).toEqual(qr);
    });

    it('debe retornar null cuando no encuentra el QR', async () => {
      mockFindOne.mockReturnValue(createQueryMock(null));

      const result = await repository.getById('QR-inexistente', tracking);

      expect(result).toBeNull();
    });

    it('debe trazar y re-lanzar el error si la consulta falla', async () => {
      mockFindOne.mockReturnValue(createQueryMock(new Error('DB down'), true));

      await expect(repository.getById('QR-1', tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getById:error',
        expect.any(Error),
      );
    });
  });

  describe('findByUserId', () => {
    it('debe retornar los QRs del usuario mapeados', async () => {
      mockFind.mockReturnValue(createQueryMock([qrDoc]));

      const result = await repository.findByUserId('user-1', tracking);

      expect(mockFind).toHaveBeenCalledWith({ userId: 'user-1' });
      expect(result).toEqual([qr]);
    });

    it('debe retornar un arreglo vacío cuando el usuario no tiene QRs', async () => {
      mockFind.mockReturnValue(createQueryMock([]));

      const result = await repository.findByUserId('user-sin-qrs', tracking);

      expect(result).toEqual([]);
    });

    it('debe trazar y re-lanzar el error si la consulta falla', async () => {
      mockFind.mockReturnValue(createQueryMock(new Error('DB down'), true));

      await expect(repository.findByUserId('user-1', tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'findByUserId:error',
        expect.any(Error),
      );
    });
  });

  describe('update', () => {
    it('debe actualizar con el mapper y retornar la entidad mapeada', async () => {
      const updatedDoc = { ...qrDoc, name: 'QR actualizado' };
      mockFindOneAndUpdate.mockReturnValue(createQueryMock(updatedDoc));

      const result = await repository.update('QR-1', { name: 'QR actualizado' }, tracking);

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { idQr: 'QR-1' },
        expect.objectContaining({ name: 'QR actualizado' }),
        { new: true },
      );
      expect(result).toEqual({ ...qr, name: 'QR actualizado' });
    });

    it('debe retornar null cuando no encuentra el QR a actualizar', async () => {
      mockFindOneAndUpdate.mockReturnValue(createQueryMock(null));

      const result = await repository.update('QR-inexistente', { name: 'X' }, tracking);

      expect(result).toBeNull();
    });

    it('debe trazar y re-lanzar el error si la actualización falla', async () => {
      mockFindOneAndUpdate.mockReturnValue(createQueryMock(new Error('DB down'), true));

      await expect(
        repository.update('QR-1', { name: 'X' }, tracking),
      ).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'update:error',
        expect.any(Error),
      );
    });
  });

  describe('activateMany', () => {
    /** Crea un resultado de updateMany que soporta .exec() */
    const createUpdateManyResult = (matchedCount: number, modifiedCount: number) => {
      const promise = Promise.resolve({ matchedCount, modifiedCount }) as unknown as {
        exec: jest.Mock;
        matchedCount: number;
        modifiedCount: number;
      };
      promise.exec = jest.fn().mockResolvedValue({ matchedCount, modifiedCount });
      return promise;
    };

    it('debe activar los QRs con 1 updateMany y retornar matchedCount/modifiedCount', async () => {
      mockUpdateMany.mockReturnValue(createUpdateManyResult(3, 3));

      const codes = ['QR-1', 'QR-2', 'QR-3'];
      const expiration = new Date('2026-08-11T00:00:00.000Z');
      const result = await repository.activateMany(codes, expiration, tracking);

      expect(mockUpdateMany).toHaveBeenCalledWith(
        { idQr: { $in: codes } },
        { $set: { active: true, expiration } },
      );
      expect(result).toEqual({ matchedCount: 3, modifiedCount: 3 });
      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'activateMany:init',
        { total: 3 },
      );
      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'activateMany:complete',
        { matchedCount: 3, modifiedCount: 3 },
      );
    });

    it('debe retornar modifiedCount menor cuando hay QRs ya activos (idempotencia RF-3)', async () => {
      mockUpdateMany.mockReturnValue(createUpdateManyResult(3, 1));

      const result = await repository.activateMany(
        ['QR-1', 'QR-2', 'QR-3'],
        new Date(),
        tracking,
      );

      expect(result).toEqual({ matchedCount: 3, modifiedCount: 1 });
    });

    it('debe retornar 0/0 cuando ningún QR coincide', async () => {
      mockUpdateMany.mockReturnValue(createUpdateManyResult(0, 0));

      const result = await repository.activateMany(['QR-inexistente'], new Date(), tracking);

      expect(result).toEqual({ matchedCount: 0, modifiedCount: 0 });
    });

    it('debe trazar y re-lanzar el error si la activación falla', async () => {
      mockUpdateMany.mockReturnValue(createUpdateManyResult(0, 0));
      mockUpdateMany.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DB down')),
      });

      await expect(
        repository.activateMany(['QR-1'], new Date(), tracking),
      ).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'activateMany:error',
        expect.any(Error),
      );
    });

    it('debe ejecutar updateMany incluso con array vacío (no lanza error)', async () => {
      mockUpdateMany.mockReturnValue(createUpdateManyResult(0, 0));

      const expiration = new Date('2026-08-11T00:00:00.000Z');
      const result = await repository.activateMany([], expiration, tracking);

      expect(mockUpdateMany).toHaveBeenCalledWith(
        { idQr: { $in: [] } },
        { $set: { active: true, expiration } },
      );
      expect(result).toEqual({ matchedCount: 0, modifiedCount: 0 });
    });
  });

  describe('delete', () => {
    it('debe retornar true cuando elimina el QR', async () => {
      mockFindOneAndDelete.mockReturnValue(createQueryMock(qrDoc));

      const result = await repository.delete('QR-1', tracking);

      expect(mockFindOneAndDelete).toHaveBeenCalledWith({ idQr: 'QR-1' });
      expect(result).toBe(true);
    });

    it('debe retornar false cuando no encuentra el QR a eliminar', async () => {
      mockFindOneAndDelete.mockReturnValue(createQueryMock(null));

      const result = await repository.delete('QR-inexistente', tracking);

      expect(result).toBe(false);
    });

    it('debe trazar y re-lanzar el error si la eliminación falla', async () => {
      mockFindOneAndDelete.mockReturnValue(createQueryMock(new Error('DB down'), true));

      await expect(repository.delete('QR-1', tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'delete:error',
        expect.any(Error),
      );
    });
  });

  describe('findPaginatedByUser', () => {
    it('debe retornar los QRs del usuario paginados sin búsqueda', async () => {
      mockFind.mockReturnValue(createQueryMock([qrDoc]));
      mockCountDocuments.mockReturnValue(createCountResult(1));

      const result = await repository.findPaginatedByUser('user-1', 1, 10, '', tracking);

      expect(mockFind).toHaveBeenCalledWith({ userId: 'user-1' });
      expect(mockCountDocuments).toHaveBeenCalledWith({ userId: 'user-1' });
      expect(result).toEqual({
        data: [qr],
        pagination: {
          total: 1,
          totalPages: 1,
          currentPage: 1,
          limit: 10,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });
    });

    it('debe combinar userId con las condiciones de búsqueda', async () => {
      mockFind.mockReturnValue(createQueryMock([qrDoc]));
      mockCountDocuments.mockReturnValue(createCountResult(25));

      const result = await repository.findPaginatedByUser('user-1', 2, 10, 'hola', tracking);

      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', $or: expect.any(Array) }),
      );
      expect(result.pagination).toEqual({
        total: 25,
        totalPages: 3,
        currentPage: 2,
        limit: 10,
        hasNextPage: true,
        hasPrevPage: true,
      });
    });

    it('debe usar los valores por defecto (page=1, limit=10, search="")', async () => {
      mockFind.mockReturnValue(createQueryMock([qrDoc]));
      mockCountDocuments.mockReturnValue(createCountResult(1));

      const result = await repository.findPaginatedByUser(
        'user-1',
        undefined,
        undefined,
        undefined,
        tracking,
      );

      expect(mockFind).toHaveBeenCalledWith({ userId: 'user-1' });
      expect(result.pagination).toEqual({
        total: 1,
        totalPages: 1,
        currentPage: 1,
        limit: 10,
        hasNextPage: false,
        hasPrevPage: false,
      });
    });

    it('debe trazar y re-lanzar el error si la consulta falla', async () => {
      mockFind.mockReturnValue(createQueryMock(new Error('DB down'), true));

      await expect(
        repository.findPaginatedByUser('user-1', 1, 10, '', tracking),
      ).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'findPaginatedByUser:error',
        expect.any(Error),
      );
    });
  });

  describe('findUserByFavorites', () => {
    const userId = '507f1f77bcf86cd799439011';
    const userId2 = '507f1f77bcf86cd799439012';

    const qrFav = {
      ...qrDoc,
      _id: { toString: () => 'qr-id-1' },
      isFavorite: true,
      updatedAt: new Date('2025-01-03T00:00:00.000Z'),
    };
    const qrNoFav = {
      ...qrDoc,
      _id: { toString: () => 'qr-id-2' },
      idQr: 'QR-2',
      isFavorite: false,
      updatedAt: new Date('2025-01-05T00:00:00.000Z'),
    };
    const petTagDoc = {
      _id: { toString: () => 'pt-id-1' },
      idQr: 'PT-1',
      name: 'Tag de mascota',
      userId,
      isFavorite: false,
      updatedAt: new Date('2025-01-04T00:00:00.000Z'),
    };

    it('debe unificar QRs y pet-tags, ordenar favoritos primero y paginar (2 aggregates con $facet)', async () => {
      mockAggregate.mockReturnValue(createAggregateFacetResult([qrFav, qrNoFav], 2));
      mockPetTagAggregate.mockReturnValue(createAggregateFacetResult([petTagDoc], 1));

      const result = await repository.findUserByFavorites(userId, 1, 10, '', '', '', tracking);

      expect(mockAggregate).toHaveBeenCalledTimes(1);
      expect(mockPetTagAggregate).toHaveBeenCalledTimes(1);
      // Paginación en BD: $skip/$limit dentro del $facet, no fetch completo
      // QR filtra por userId string (schema L89); pet-tag por ObjectId (schema L68)
      expect(mockAggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ $match: expect.objectContaining({ userId: userId }) }),
          expect.objectContaining({ $sort: { isFavorite: -1, updatedAt: -1 } }),
          expect.objectContaining({
            $facet: {
              data: expect.arrayContaining([{ $skip: 0 }, { $limit: 10 }]),
              total: [{ $count: 'v' }],
            },
          }),
        ]),
      );
      expect(mockPetTagAggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ $match: expect.objectContaining({ userId: expect.any(Types.ObjectId) }) }),
        ]),
      );
      expect(mockFind).not.toHaveBeenCalled();
      expect(mockCountDocuments).not.toHaveBeenCalled();
      expect(result.data).toHaveLength(3);
      expect(result.data[0]).toEqual(expect.objectContaining({ resultType: 'qr', isFavorite: true }));
      expect(result.data[1]).toEqual(
        expect.objectContaining({ resultType: 'qr', idQr: 'QR-2', isFavorite: false }),
      );
      expect(result.data[2]).toEqual(expect.objectContaining({ resultType: 'pet-tag' }));
      expect(result.pagination).toEqual({
        total: 3,
        totalPages: 1,
        currentPage: '1',
        limit: '10',
        hasNextPage: false,
        hasPrevPage: false,
      });
      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'findUserByFavorites:complete',
        expect.any(Object),
      );
    });

    it('debe aplicar condiciones de búsqueda a ambos modelos', async () => {
      mockAggregate.mockReturnValue(createAggregateFacetResult([], 0));
      mockPetTagAggregate.mockReturnValue(createAggregateFacetResult([], 0));

      await repository.findUserByFavorites(userId, 1, 10, 'hola', '', '', tracking);

      expect(mockAggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ $match: expect.objectContaining({ $or: expect.any(Array) }) }),
        ]),
      );
      expect(mockPetTagAggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ $match: expect.objectContaining({ $or: expect.any(Array) }) }),
        ]),
      );
    });

    it('debe usar userId2 cuando el rol es admin y se entrega userId2', async () => {
      mockAggregate.mockReturnValue(createAggregateFacetResult([], 0));
      mockPetTagAggregate.mockReturnValue(createAggregateFacetResult([], 0));

      await repository.findUserByFavorites(userId, 1, 10, '', 'admin', userId2, tracking);

      // QR: userId string; pet-tag: ObjectId
      expect(mockAggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ $match: expect.objectContaining({ userId: userId2 }) }),
        ]),
      );
      expect(mockPetTagAggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ $match: expect.objectContaining({ userId: expect.any(Types.ObjectId) }) }),
        ]),
      );
    });

    it('debe usar userId cuando el rol es admin pero no se entrega userId2', async () => {
      mockAggregate.mockReturnValue(createAggregateFacetResult([], 0));
      mockPetTagAggregate.mockReturnValue(createAggregateFacetResult([], 0));

      await repository.findUserByFavorites(userId, 1, 10, '', 'admin', '', tracking);

      expect(mockAggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ $match: expect.objectContaining({ userId: userId }) }),
        ]),
      );
      expect(mockPetTagAggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ $match: expect.objectContaining({ userId: expect.any(Types.ObjectId) }) }),
        ]),
      );
    });

    it('debe tratar como no favoritos los items sin campo isFavorite', async () => {
      const qrSinFavorito = { ...qrDoc, _id: { toString: () => 'qr-id-9' }, isFavorite: undefined };
      mockAggregate.mockReturnValue(createAggregateFacetResult([qrSinFavorito], 1));
      mockPetTagAggregate.mockReturnValue(createAggregateFacetResult([], 0));

      const result = await repository.findUserByFavorites(userId, 1, 10, '', '', '', tracking);

      expect(result.data[0]).toEqual(expect.objectContaining({ resultType: 'qr' }));
      expect(result.pagination.total).toBe(1);
    });

    it('debe aplicar $skip/$limit en BD según la página (paginación en origen)', async () => {
      mockAggregate.mockReturnValue(createAggregateFacetResult([qrFav], 2));
      mockPetTagAggregate.mockReturnValue(createAggregateFacetResult([petTagDoc], 1));

      const result = await repository.findUserByFavorites(userId, 2, 1, '', '', '', tracking);

      const qrAggregateCall = mockAggregate.mock.calls[0][0] as Array<Record<string, unknown>>;
      const qrFacet = qrAggregateCall.find((s) => s.$facet)?.$facet as {
        data: Array<Record<string, unknown>>;
      };
      expect(qrFacet.data).toEqual([{ $skip: 1 }, { $limit: 1 }]);
      expect(result.pagination).toEqual({
        total: 3,
        totalPages: 3,
        currentPage: '2',
        limit: '1',
        hasNextPage: true,
        hasPrevPage: true,
      });
    });

    it('debe normalizar page/limit string a número (no-regresión: $limit exige número — bug encontrado por E2E)', async () => {
      mockAggregate.mockReturnValue(createAggregateFacetResult([qrFav], 2));
      mockPetTagAggregate.mockReturnValue(createAggregateFacetResult([petTagDoc], 1));

      // El controller pasa query params como strings ("page=2&limit=1")
      const result = await repository.findUserByFavorites(
        userId,
        '2' as unknown as number,
        '1' as unknown as number,
        '',
        '',
        '',
        tracking,
      );

      const qrAggregateCall = mockAggregate.mock.calls[0][0] as Array<Record<string, unknown>>;
      const qrFacet = qrAggregateCall.find((s) => s.$facet)?.$facet as {
        data: Array<Record<string, unknown>>;
      };
      // $skip/$limit numéricos (no strings) — Mongo rechaza $limit: "1"
      expect(qrFacet.data).toEqual([{ $skip: 1 }, { $limit: 1 }]);
      expect(result.pagination.currentPage).toBe('2');
      expect(result.pagination.limit).toBe('1');
    });

    it('debe lanzar HttpException y trazar el error si la consulta falla', async () => {
      mockAggregate.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DB down')),
      });

      await expect(
        repository.findUserByFavorites(userId, 1, 10, '', '', '', tracking),
      ).rejects.toThrow(HttpException);
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'findUserByFavorites:error',
        expect.any(Error),
      );
    });

    it('debe lanzar HttpException cuando el userId no es un ObjectId válido', async () => {
      await expect(
        repository.findUserByFavorites('user-invalido', 1, 10, '', '', '', tracking),
      ).rejects.toThrow(HttpException);
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'findUserByFavorites:error',
        expect.any(Error),
      );
    });
  });
});