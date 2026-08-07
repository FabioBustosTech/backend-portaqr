import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UpdatePlanUseCase } from './update-plan.usecase';
import { PLAN_UPDATE_PORT } from '../../domain/constants/plan.tokens';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { ICanUpdatePlan } from '../../domain/ports/queries/plan.port';
import { DurationType } from '../../domain/entities/plan.entity';
import type { Plan } from '../../domain/entities/plan.entity';
import type { UpdatePlanDto } from '../dto/update-plan.dto';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';

describe('UpdatePlanUseCase', () => {
  let useCase: UpdatePlanUseCase;
  let updater: jest.Mocked<ICanUpdatePlan>;
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
        UpdatePlanUseCase,
        {
          provide: PLAN_UPDATE_PORT,
          useValue: {
            update: jest.fn(),
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

    useCase = module.get(UpdatePlanUseCase);
    updater = module.get(PLAN_UPDATE_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe actualizar el plan y retornar el resultado', async () => {
      const dto: UpdatePlanDto = { name: 'Plan Premium Plus', price: 129.99 };
      const updated = { ...mockPlan, name: 'Plan Premium Plus', price: 129.99 };
      updater.update.mockResolvedValue(updated);

      const result = await useCase.execute('plan-1', dto, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'UpdatePlanUseCase - input',
        { id: 'plan-1' },
      );
      expect(updater.update).toHaveBeenCalledWith('plan-1', dto, tracking);
      expect(result).toEqual(updated);
    });

    it('debe lanzar NotFoundException cuando el plan no existe', async () => {
      updater.update.mockResolvedValue(null);

      await expect(
        useCase.execute('plan-inexistente', { name: 'X' }, tracking),
      ).rejects.toThrow(NotFoundException);
      await expect(
        useCase.execute('plan-inexistente', { name: 'X' }, tracking),
      ).rejects.toThrow('Plan con ID plan-inexistente no encontrado');
      expect(traceService.warn).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'UpdatePlanUseCase - not found',
        { id: 'plan-inexistente' },
      );
    });

    it('debe propagar errores lanzados por el puerto', async () => {
      updater.update.mockRejectedValue(new Error('Error de base de datos'));

      await expect(
        useCase.execute('plan-1', { name: 'X' }, tracking),
      ).rejects.toThrow('Error de base de datos');
    });
  });
});