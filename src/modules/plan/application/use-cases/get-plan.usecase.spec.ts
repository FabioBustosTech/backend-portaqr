import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetPlanUseCase } from './get-plan.usecase';
import { PLAN_GET_PORT } from '../../domain/constants/plan.tokens';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { ICanGetPlan } from '../../domain/ports/queries/plan.port';
import { DurationType } from '../../domain/entities/plan.entity';
import type { Plan } from '../../domain/entities/plan.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';

describe('GetPlanUseCase', () => {
  let useCase: GetPlanUseCase;
  let reader: jest.Mocked<ICanGetPlan>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetPlanUseCase,
        {
          provide: PLAN_GET_PORT,
          useValue: {
            getById: jest.fn(),
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

    useCase = module.get(GetPlanUseCase);
    reader = module.get(PLAN_GET_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe retornar el plan cuando existe', async () => {
      reader.getById.mockResolvedValue(mockPlan);

      const result = await useCase.execute('plan-1', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'GetPlanUseCase - input',
        { id: 'plan-1' },
      );
      expect(reader.getById).toHaveBeenCalledWith('plan-1', tracking);
      expect(result).toEqual(mockPlan);
    });

    it('debe lanzar NotFoundException cuando el plan no existe', async () => {
      reader.getById.mockResolvedValue(null);

      await expect(useCase.execute('plan-inexistente', tracking)).rejects.toThrow(
        NotFoundException,
      );
      await expect(useCase.execute('plan-inexistente', tracking)).rejects.toThrow(
        'Plan con ID plan-inexistente no encontrado',
      );
      expect(traceService.warn).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'GetPlanUseCase - not found',
        { id: 'plan-inexistente' },
      );
    });

    it('debe propagar errores lanzados por el puerto', async () => {
      reader.getById.mockRejectedValue(new Error('Error de base de datos'));

      await expect(useCase.execute('plan-1', tracking)).rejects.toThrow(
        'Error de base de datos',
      );
    });
  });
});