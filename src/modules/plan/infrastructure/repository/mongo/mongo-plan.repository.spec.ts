import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoPlanRepository } from './mongo-plan.repository';
import { PlanSchema, PlanDocument } from './schemas/plan.schema';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { DurationType } from '../../../domain/entities/plan.entity';
import type { Plan } from '../../../domain/entities/plan.entity';

const mockSave = jest.fn();
const mockFind = jest.fn();
const mockFindById = jest.fn();
const mockFindByIdAndUpdate = jest.fn();
const mockFindByIdAndDelete = jest.fn();
const mockCountDocuments = jest.fn();

const modelMock = jest.fn().mockImplementation((data: Record<string, unknown>) => ({
  ...data,
  save: mockSave,
})) as unknown as Model<PlanDocument>;

(modelMock as unknown as Record<string, unknown>).find = mockFind;
(modelMock as unknown as Record<string, unknown>).findById = mockFindById;
(modelMock as unknown as Record<string, unknown>).findByIdAndUpdate = mockFindByIdAndUpdate;
(modelMock as unknown as Record<string, unknown>).findByIdAndDelete = mockFindByIdAndDelete;
(modelMock as unknown as Record<string, unknown>).countDocuments = mockCountDocuments;

describe('MongoPlanRepository', () => {
  let repository: MongoPlanRepository;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const plan: Plan = {
    id: 'plan-1',
    name: 'Plan Básico',
    description: 'Plan básico',
    status: 'ACTIVO',
    details: [{ detail: 'QR ilimitado' }],
    price: 5000,
    active: true,
    populier: false,
    free: false,
    detailDuration: { type: DurationType.MONTHS, duration: 1 },
    typeQr: 'STATIC',
  };

  const doc = {
    _id: { toString: () => 'plan-1' },
    name: 'Plan Básico',
    description: 'Plan básico',
    status: 'ACTIVO',
    details: [{ detail: 'QR ilimitado' }],
    price: 5000,
    active: true,
    populier: false,
    free: false,
    detailDuration: { type: DurationType.MONTHS, duration: 1 },
    typeQr: 'STATIC',
    createdDate: new Date('2024-01-01'),
    updatedDate: new Date('2024-01-02'),
  };

  const buildFindChain = (result: unknown) => ({
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(result) }),
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongoPlanRepository,
        {
          provide: getModelToken(PlanSchema.name),
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

    repository = module.get(MongoPlanRepository);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('debe crear el plan con el mapper y retornar la entidad mapeada', async () => {
      mockSave.mockResolvedValue(doc);

      const result = await repository.create(plan, tracking);

      expect(modelMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Plan Básico',
          price: 5000,
          typeQr: 'STATIC',
        }),
      );
      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(result).toEqual(
        expect.objectContaining({
          id: 'plan-1',
          name: 'Plan Básico',
          createdAt: doc.createdDate,
          updatedAt: doc.updatedDate,
        }),
      );
    });

    it('debe trazar y re-lanzar el error si el guardado falla', async () => {
      mockSave.mockRejectedValue(new Error('DB down'));

      await expect(repository.create(plan, tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'create:error',
        expect.any(Error),
      );
    });
  });

  describe('getAll', () => {
    it('debe retornar planes paginados sin búsqueda', async () => {
      mockFind.mockReturnValue(buildFindChain([doc]));
      mockCountDocuments.mockResolvedValue(1);

      const result = await repository.getAll(1, 10, '', tracking);

      expect(mockFind).toHaveBeenCalledWith({});
      expect(result).toEqual({
        data: [expect.objectContaining({ id: 'plan-1', name: 'Plan Básico' })],
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

    it('debe construir el filtro de búsqueda con $or', async () => {
      mockFind.mockReturnValue(buildFindChain([]));
      mockCountDocuments.mockResolvedValue(0);

      await repository.getAll(1, 10, 'básico', tracking);

      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: [
            { name: { $regex: 'básico', $options: 'i' } },
            { description: { $regex: 'básico', $options: 'i' } },
            { typeQr: { $regex: 'básico', $options: 'i' } },
          ],
        }),
      );
    });

    it('debe escapar metacaracteres del término de búsqueda (SPEC-008 H3 — R2 ReDoS, CA-02)', async () => {
      mockFind.mockReturnValue(buildFindChain([]));
      mockCountDocuments.mockResolvedValue(0);

      // (a+)+$ con backtracking exponencial → debe llegar a $regex como literal
      await repository.getAll(1, 10, '(a+)+$', tracking);

      const escaped = '\\(a\\+\\)\\+\\$';
      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: [
            { name: { $regex: escaped, $options: 'i' } },
            { description: { $regex: escaped, $options: 'i' } },
            { typeQr: { $regex: escaped, $options: 'i' } },
          ],
        }),
      );
    });

    it('debe calcular hasNextPage y hasPrevPage correctamente', async () => {
      mockFind.mockReturnValue(buildFindChain([doc, doc, doc]));
      mockCountDocuments.mockResolvedValue(25);

      const result = await repository.getAll(2, 10, '', tracking);

      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPrevPage).toBe(true);
    });

    it('debe trazar y re-lanzar el error si la consulta falla', async () => {
      mockFind.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(new Error('DB down')),
        }),
      });

      await expect(repository.getAll(1, 10, '', tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getAll:error',
        expect.any(Error),
      );
    });
  });

  describe('getById', () => {
    it('debe retornar la entidad mapeada cuando encuentra el plan', async () => {
      mockFindById.mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) }),
      });

      const result = await repository.getById('plan-1', tracking);

      expect(mockFindById).toHaveBeenCalledWith('plan-1');
      expect(result).toEqual(
        expect.objectContaining({ id: 'plan-1', name: 'Plan Básico' }),
      );
    });

    it('debe retornar null cuando no encuentra el plan', async () => {
      mockFindById.mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      });

      const result = await repository.getById('plan-inexistente', tracking);

      expect(result).toBeNull();
    });

    it('debe trazar y re-lanzar el error si la consulta falla', async () => {
      mockFindById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(new Error('DB down')),
        }),
      });

      await expect(repository.getById('plan-1', tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getById:error',
        expect.any(Error),
      );
    });
  });

  describe('update', () => {
    it('debe actualizar con $set y retornar la entidad mapeada', async () => {
      const updatedDoc = { ...doc, name: 'Plan Premium' };
      mockFindByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(updatedDoc) }),
      });

      const result = await repository.update('plan-1', { name: 'Plan Premium' }, tracking);

      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        'plan-1',
        { $set: expect.objectContaining({ name: 'Plan Premium' }) },
        { new: true },
      );
      expect(result).toEqual(
        expect.objectContaining({ id: 'plan-1', name: 'Plan Premium' }),
      );
    });

    it('debe retornar null cuando no encuentra el plan a actualizar', async () => {
      mockFindByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      });

      const result = await repository.update('plan-1', { name: 'X' }, tracking);

      expect(result).toBeNull();
    });

    it('debe trazar y re-lanzar el error si la actualización falla', async () => {
      mockFindByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(new Error('DB down')),
        }),
      });

      await expect(
        repository.update('plan-1', { name: 'X' }, tracking),
      ).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'update:error',
        expect.any(Error),
      );
    });
  });

  describe('remove', () => {
    it('debe retornar true cuando elimina el plan', async () => {
      mockFindByIdAndDelete.mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });

      const result = await repository.remove('plan-1', tracking);

      expect(mockFindByIdAndDelete).toHaveBeenCalledWith('plan-1');
      expect(result).toBe(true);
    });

    it('debe retornar false cuando no encuentra el plan a eliminar', async () => {
      mockFindByIdAndDelete.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const result = await repository.remove('plan-inexistente', tracking);

      expect(result).toBe(false);
    });

    it('debe trazar y re-lanzar el error si la eliminación falla', async () => {
      mockFindByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DB down')),
      });

      await expect(repository.remove('plan-1', tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'remove:error',
        expect.any(Error),
      );
    });
  });
});