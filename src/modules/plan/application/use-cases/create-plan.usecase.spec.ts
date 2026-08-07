import { Test, TestingModule } from '@nestjs/testing';
import { CreatePlanUseCase } from './create-plan.usecase';
import { PLAN_CREATE_PORT } from '../../domain/constants/plan.tokens';
import { PlanEntity, DurationType } from '../../domain/entities/plan.entity';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { ICanCreatePlan } from '../../domain/ports/queries/plan.port';
import type { Plan } from '../../domain/entities/plan.entity';
import type { CreatePlanDto } from '../dto/create-plan.dto';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';

describe('CreatePlanUseCase', () => {
  let useCase: CreatePlanUseCase;
  let creator: jest.Mocked<ICanCreatePlan>;
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

  const savedPlan: Plan = {
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatePlanUseCase,
        {
          provide: PLAN_CREATE_PORT,
          useValue: {
            create: jest.fn(),
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

    useCase = module.get(CreatePlanUseCase);
    creator = module.get(PLAN_CREATE_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe crear un plan construyendo la entidad y delegando al puerto', async () => {
      creator.create.mockResolvedValue(savedPlan);

      const result = await useCase.execute(createPlanDto, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'CreatePlanUseCase - input',
        { name: 'Plan Premium', price: 99.99 },
      );
      expect(creator.create).toHaveBeenCalledTimes(1);
      const entityArg = creator.create.mock.calls[0][0];
      expect(entityArg).toBeInstanceOf(PlanEntity);
      expect(entityArg).toMatchObject({
        name: 'Plan Premium',
        description: 'Plan con características premium',
        status: 'active',
        details: [{ detail: 'Acceso ilimitado' }],
        price: 99.99,
        active: true,
        populier: true,
        typeQr: 'dynamic',
      });
      expect(creator.create).toHaveBeenCalledWith(expect.any(PlanEntity), tracking);
      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'CreatePlanUseCase - created',
        { id: 'plan-1', name: 'Plan Premium' },
      );
      expect(result).toEqual(savedPlan);
    });

    it('debe aplicar valores por defecto de la entidad cuando el DTO es parcial', async () => {
      const partialDto = {
        name: 'Plan Básico',
        description: 'Plan básico',
        status: 'active',
        price: 0,
      } as CreatePlanDto;
      creator.create.mockResolvedValue({ ...savedPlan, name: 'Plan Básico' });

      await useCase.execute(partialDto, tracking);

      const entityArg = creator.create.mock.calls[0][0];
      expect(entityArg.details).toEqual([]);
      expect(entityArg.active).toBe(true);
      expect(entityArg.populier).toBe(false);
      expect(entityArg.free).toBe(false);
      expect(entityArg.detailDuration).toEqual({
        type: DurationType.MONTHS,
        duration: 1,
      });
      expect(entityArg.typeQr).toBe('');
    });

    it('debe propagar errores lanzados por el puerto', async () => {
      creator.create.mockRejectedValue(new Error('No se pudo crear el plan'));

      await expect(useCase.execute(createPlanDto, tracking)).rejects.toThrow(
        'No se pudo crear el plan',
      );
    });
  });
});