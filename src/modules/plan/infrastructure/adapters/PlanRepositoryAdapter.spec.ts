import { Test, TestingModule } from '@nestjs/testing';
import { PlanRepositoryAdapter } from './PlanRepositoryAdapter';
import { MongoPlanRepository } from '../repository/mongo/mongo-plan.repository';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { DurationType } from '../../domain/entities/plan.entity';
import type { Plan, PaginatedPlans } from '../../domain/entities/plan.entity';

describe('PlanRepositoryAdapter', () => {
  let adapter: PlanRepositoryAdapter;
  let mongoRepository: jest.Mocked<MongoPlanRepository>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const plan: Plan = {
    id: 'plan-1',
    name: 'Plan Básico',
    description: 'Plan básico',
    status: 'ACTIVO',
    details: [],
    price: 5000,
    active: true,
    populier: false,
    free: false,
    detailDuration: { type: DurationType.MONTHS, duration: 1 },
    typeQr: 'STATIC',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanRepositoryAdapter,
        {
          provide: MongoPlanRepository,
          useValue: {
            create: jest.fn(),
            getAll: jest.fn(),
            getById: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    adapter = module.get(PlanRepositoryAdapter);
    mongoRepository = module.get(MongoPlanRepository);
  });

  it('debe estar definido', () => {
    expect(adapter).toBeDefined();
  });

  describe('create', () => {
    it('debe delegar la creación al repositorio mongo', async () => {
      mongoRepository.create.mockResolvedValue(plan);

      const result = await adapter.create(plan, tracking);

      expect(mongoRepository.create).toHaveBeenCalledWith(plan, tracking);
      expect(result).toEqual(plan);
    });
  });

  describe('getAll', () => {
    it('debe delegar la consulta paginada al repositorio mongo', async () => {
      const paginated: PaginatedPlans = {
        data: [plan],
        pagination: {
          total: 1,
          totalPages: 1,
          currentPage: 1,
          limit: 10,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
      mongoRepository.getAll.mockResolvedValue(paginated);

      const result = await adapter.getAll(1, 10, '', tracking);

      expect(mongoRepository.getAll).toHaveBeenCalledWith(1, 10, '', tracking);
      expect(result).toEqual(paginated);
    });
  });

  describe('getById', () => {
    it('debe delegar la consulta por id al repositorio mongo', async () => {
      mongoRepository.getById.mockResolvedValue(plan);

      const result = await adapter.getById('plan-1', tracking);

      expect(mongoRepository.getById).toHaveBeenCalledWith('plan-1', tracking);
      expect(result).toEqual(plan);
    });

    it('debe retornar null cuando el repositorio no encuentra el plan', async () => {
      mongoRepository.getById.mockResolvedValue(null);

      const result = await adapter.getById('plan-inexistente', tracking);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('debe delegar la actualización al repositorio mongo', async () => {
      const updated = { ...plan, name: 'Plan Premium' };
      mongoRepository.update.mockResolvedValue(updated);

      const result = await adapter.update('plan-1', { name: 'Plan Premium' }, tracking);

      expect(mongoRepository.update).toHaveBeenCalledWith(
        'plan-1',
        { name: 'Plan Premium' },
        tracking,
      );
      expect(result).toEqual(updated);
    });

    it('debe retornar null cuando el repositorio no actualiza nada', async () => {
      mongoRepository.update.mockResolvedValue(null);

      const result = await adapter.update('plan-1', { name: 'X' }, tracking);

      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('debe delegar la eliminación al repositorio mongo', async () => {
      mongoRepository.remove.mockResolvedValue(true);

      const result = await adapter.remove('plan-1', tracking);

      expect(mongoRepository.remove).toHaveBeenCalledWith('plan-1', tracking);
      expect(result).toBe(true);
    });

    it('debe retornar false cuando el repositorio no elimina nada', async () => {
      mongoRepository.remove.mockResolvedValue(false);

      const result = await adapter.remove('plan-inexistente', tracking);

      expect(result).toBe(false);
    });
  });
});