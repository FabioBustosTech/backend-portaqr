import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DeletePlanUseCase } from './delete-plan.usecase';
import { PLAN_DELETE_PORT } from '../../domain/constants/plan.tokens';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { ICanDeletePlan } from '../../domain/ports/queries/plan.port';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';

describe('DeletePlanUseCase', () => {
  let useCase: DeletePlanUseCase;
  let deleter: jest.Mocked<ICanDeletePlan>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeletePlanUseCase,
        {
          provide: PLAN_DELETE_PORT,
          useValue: {
            remove: jest.fn(),
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

    useCase = module.get(DeletePlanUseCase);
    deleter = module.get(PLAN_DELETE_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe eliminar el plan cuando el puerto confirma la eliminación', async () => {
      deleter.remove.mockResolvedValue(true);

      await expect(useCase.execute('plan-1', tracking)).resolves.toBeUndefined();

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'DeletePlanUseCase - input',
        { id: 'plan-1' },
      );
      expect(deleter.remove).toHaveBeenCalledWith('plan-1', tracking);
      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'DeletePlanUseCase - deleted',
        { id: 'plan-1' },
      );
    });

    it('debe lanzar NotFoundException cuando el plan no existe', async () => {
      deleter.remove.mockResolvedValue(false);

      await expect(useCase.execute('plan-inexistente', tracking)).rejects.toThrow(
        NotFoundException,
      );
      await expect(useCase.execute('plan-inexistente', tracking)).rejects.toThrow(
        'Plan con ID plan-inexistente no encontrado',
      );
      expect(traceService.warn).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'DeletePlanUseCase - not found',
        { id: 'plan-inexistente' },
      );
    });

    it('debe propagar errores lanzados por el puerto', async () => {
      deleter.remove.mockRejectedValue(new Error('Error al eliminar'));

      await expect(useCase.execute('plan-1', tracking)).rejects.toThrow(
        'Error al eliminar',
      );
    });
  });
});