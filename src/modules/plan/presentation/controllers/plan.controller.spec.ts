import { Test, TestingModule } from '@nestjs/testing';
import { PlanController } from './plan.controller';
import { CreatePlanUseCase } from '../../application/use-cases/create-plan.usecase';
import { GetAllPlanUseCase } from '../../application/use-cases/get-all-plan.usecase';
import { GetPlanUseCase } from '../../application/use-cases/get-plan.usecase';
import { UpdatePlanUseCase } from '../../application/use-cases/update-plan.usecase';
import { DeletePlanUseCase } from '../../application/use-cases/delete-plan.usecase';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import type { CreatePlanDto } from '../../application/dto/create-plan.dto';
import type { UpdatePlanDto } from '../../application/dto/update-plan.dto';
import { DurationType } from '../../domain/entities/plan.entity';
import type { Plan, PaginatedPlans } from '../../domain/entities/plan.entity';

describe('PlanController', () => {
  let controller: PlanController;
  let createPlanUseCase: jest.Mocked<CreatePlanUseCase>;
  let getAllPlanUseCase: jest.Mocked<GetAllPlanUseCase>;
  let getPlanUseCase: jest.Mocked<GetPlanUseCase>;
  let updatePlanUseCase: jest.Mocked<UpdatePlanUseCase>;
  let deletePlanUseCase: jest.Mocked<DeletePlanUseCase>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const createPlanDto: CreatePlanDto = {
    name: 'Plan Premium',
    description: 'Plan con características premium',
    status: 'active',
    endDate: new Date('2024-12-31T23:59:59.999Z'),
    updatedDate: new Date('2024-01-01T00:00:00.000Z'),
    createdDate: new Date('2024-01-01T00:00:00.000Z'),
    details: [{ detail: 'Acceso ilimitado' }],
    price: 99.99,
    active: true,
    populier: true,
    typeQr: 'dynamic',
  };

  const mockPlan: Plan = {
    id: 'plan-1',
    name: 'Plan Premium',
    description: 'Plan con características premium',
    status: 'active',
    details: [{ detail: 'Acceso ilimitado' }],
    price: 99.99,
    active: true,
    populier: true,
    free: false,
    detailDuration: { type: DurationType.MONTHS, duration: 1 },
    typeQr: 'dynamic',
  };

  const mockPaginated: PaginatedPlans = {
    data: [mockPlan],
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
        PlanController,
        {
          provide: CreatePlanUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetAllPlanUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetPlanUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: UpdatePlanUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: DeletePlanUseCase,
          useValue: { execute: jest.fn() },
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

    controller = module.get(PlanController);
    createPlanUseCase = module.get(CreatePlanUseCase);
    getAllPlanUseCase = module.get(GetAllPlanUseCase);
    getPlanUseCase = module.get(GetPlanUseCase);
    updatePlanUseCase = module.get(UpdatePlanUseCase);
    deletePlanUseCase = module.get(DeletePlanUseCase);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('debe crear un plan y delegar al use-case', async () => {
      createPlanUseCase.execute.mockResolvedValue(mockPlan);

      const result = await controller.create(createPlanDto, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'POST /plan',
        { name: 'Plan Premium' },
      );
      expect(createPlanUseCase.execute).toHaveBeenCalledWith(createPlanDto, tracking);
      expect(result).toEqual(mockPlan);
    });
  });

  describe('findAll', () => {
    it('debe listar los planes con paginación y delegar al use-case', async () => {
      getAllPlanUseCase.execute.mockResolvedValue(mockPaginated);

      const result = await controller.findAll(1, 10, 'premium', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'GET /plan',
        { page: 1, limit: 10, search: 'premium' },
      );
      expect(getAllPlanUseCase.execute).toHaveBeenCalledWith(1, 10, 'premium', tracking);
      expect(result).toEqual(mockPaginated);
    });

    it('debe usar valores por defecto cuando no se entregan query params', async () => {
      getAllPlanUseCase.execute.mockResolvedValue(mockPaginated);

      await controller.findAll(undefined, undefined, undefined, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'GET /plan',
        { page: 1, limit: 10, search: '' },
      );
      expect(getAllPlanUseCase.execute).toHaveBeenCalledWith(1, 10, '', tracking);
    });
  });

  describe('findOne', () => {
    it('debe retornar un plan por id y delegar al use-case', async () => {
      getPlanUseCase.execute.mockResolvedValue(mockPlan);

      const result = await controller.findOne('plan-1', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'GET /plan/:id',
        { id: 'plan-1' },
      );
      expect(getPlanUseCase.execute).toHaveBeenCalledWith('plan-1', tracking);
      expect(result).toEqual(mockPlan);
    });
  });

  describe('update', () => {
    it('debe actualizar un plan y delegar al use-case', async () => {
      const updateDto: UpdatePlanDto = { name: 'Plan Premium Plus' };
      const updated = { ...mockPlan, name: 'Plan Premium Plus' };
      updatePlanUseCase.execute.mockResolvedValue(updated);

      const result = await controller.update('plan-1', updateDto, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'PATCH /plan/:id',
        { id: 'plan-1' },
      );
      expect(updatePlanUseCase.execute).toHaveBeenCalledWith('plan-1', updateDto, tracking);
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('debe eliminar un plan y retornar mensaje de éxito', async () => {
      deletePlanUseCase.execute.mockResolvedValue(undefined);

      const result = await controller.remove('plan-1', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'DELETE /plan/:id',
        { id: 'plan-1' },
      );
      expect(deletePlanUseCase.execute).toHaveBeenCalledWith('plan-1', tracking);
      expect(result).toEqual({ message: 'Plan eliminado exitosamente' });
    });
  });
});