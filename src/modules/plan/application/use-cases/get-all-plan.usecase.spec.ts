import { Test, TestingModule } from '@nestjs/testing';
import { GetAllPlanUseCase } from './get-all-plan.usecase';
import { PLAN_GET_ALL_PORT } from '../../domain/constants/plan.tokens';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { ICanGetAllPlan } from '../../domain/ports/queries/plan.port';
import { DurationType } from '../../domain/entities/plan.entity';
import type { PaginatedPlans } from '../../domain/entities/plan.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';

describe('GetAllPlanUseCase', () => {
  let useCase: GetAllPlanUseCase;
  let reader: jest.Mocked<ICanGetAllPlan>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const mockPaginated: PaginatedPlans = {
    data: [
      {
        id: 'plan-1',
        name: 'Plan Premium',
        description: 'Plan con características premium',
        status: 'active',
        details: [],
        price: 99.99,
        active: true,
        populier: true,
        free: false,
        detailDuration: { type: DurationType.MONTHS, duration: 1 },
        typeQr: 'dynamic',
      },
    ],
    pagination: {
      total: 1,
      totalPages: 1,
      currentPage: 1,
      limit: 10,
      hasNextPage: false,
      hasPrevPage: false,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllPlanUseCase,
        {
          provide: PLAN_GET_ALL_PORT,
          useValue: {
            getAll: jest.fn(),
          },
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

    useCase = module.get(GetAllPlanUseCase);
    reader = module.get(PLAN_GET_ALL_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe retornar los planes paginados delegando al puerto', async () => {
      reader.getAll.mockResolvedValue(mockPaginated);

      const result = await useCase.execute(1, 10, 'premium', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'GetAllPlanUseCase - input',
        { page: 1, limit: 10, search: 'premium' },
      );
      expect(reader.getAll).toHaveBeenCalledWith(1, 10, 'premium', tracking);
      expect(result).toEqual(mockPaginated);
    });

    it('debe funcionar con búsqueda vacía y paginación por defecto', async () => {
      reader.getAll.mockResolvedValue({ data: [], pagination: mockPaginated.pagination });

      const result = await useCase.execute(1, 10, '', tracking);

      expect(reader.getAll).toHaveBeenCalledWith(1, 10, '', tracking);
      expect(result.data).toEqual([]);
    });

    it('debe propagar errores lanzados por el puerto', async () => {
      reader.getAll.mockRejectedValue(new Error('Error al listar planes'));

      await expect(useCase.execute(1, 10, '', tracking)).rejects.toThrow(
        'Error al listar planes',
      );
    });
  });
});