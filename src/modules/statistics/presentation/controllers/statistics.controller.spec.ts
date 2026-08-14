import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsController } from './statistics.controller';
import { GetUserStatisticsUseCase } from '../../application/use-cases/get-user-statistics.usecase';
import { GetSystemStatisticsUseCase } from '../../application/use-cases/get-system-statistics.usecase';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import type { UserStatistics } from '../../domain/entities/statistics.entity';
import type { SystemStatistics } from '../../domain/entities/statistics.entity';

describe('StatisticsController', () => {
  let controller: StatisticsController;
  let getUserStatisticsUseCase: jest.Mocked<GetUserStatisticsUseCase>;
  let getSystemStatisticsUseCase: jest.Mocked<GetSystemStatisticsUseCase>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const mockUserStatistics: UserStatistics = {
    scans: { total: 120, monthly: 40, daily: 5 },
    qrs: { total: 12, active: 10 },
  };

  const mockSystemStatistics: SystemStatistics = {
    scans: { total: 1000, monthly: 250, daily: 30 },
    qrs: { total: 200, active: 180 },
    users: { total: 50, active: 35 },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatisticsController],
      providers: [
        {
          provide: GetUserStatisticsUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetSystemStatisticsUseCase,
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

    controller = module.get(StatisticsController);
    getUserStatisticsUseCase = module.get(GetUserStatisticsUseCase);
    getSystemStatisticsUseCase = module.get(GetSystemStatisticsUseCase);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('getUserStatistics', () => {
    it('debe retornar las estadísticas del usuario delegando en el use case (admin)', async () => {
      getUserStatisticsUseCase.execute.mockResolvedValue(mockUserStatistics);

      const result = await controller.getUserStatistics('user-1', { id: 'admin-1', role: 'admin' } as any, tracking);

      expect(getUserStatisticsUseCase.execute).toHaveBeenCalledWith('user-1', tracking);
      expect(result).toEqual(mockUserStatistics);
    });

    it('debe registrar la traza del GET /statistics/user/:userId con el userId', async () => {
      getUserStatisticsUseCase.execute.mockResolvedValue(mockUserStatistics);

      await controller.getUserStatistics('user-1', { id: 'admin-1', role: 'admin' } as any, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'GET /statistics/user/:userId',
        expect.objectContaining({ userId: 'user-1' }),
      );
    });

    it('CA-05 (SPEC-014): es owner-or-admin — metadata @Roles contiene admin Y user', () => {
      const roles = Reflect.getMetadata('roles', StatisticsController.prototype.getUserStatistics);
      expect(roles).toEqual(['admin', 'user']);
    });

    it('CA-05 (SPEC-014): un usuario NO-admin con userId ajeno → 403 (IDOR cerrado)', async () => {
      await expect(
        controller.getUserStatistics('otro-usuario', { id: 'user-1', role: 'user' } as any, tracking),
      ).rejects.toThrow(expect.objectContaining({ name: 'ForbiddenException' }));
      expect(getUserStatisticsUseCase.execute).not.toHaveBeenCalled();
    });

    it('CA-05 (SPEC-014): un usuario con SU PROPIO userId → 200 (dashboard propio)', async () => {
      getUserStatisticsUseCase.execute.mockResolvedValue(mockUserStatistics);
      const result = await controller.getUserStatistics('user-1', { id: 'user-1', role: 'user' } as any, tracking);
      expect(getUserStatisticsUseCase.execute).toHaveBeenCalledWith('user-1', tracking);
      expect(result).toEqual(mockUserStatistics);
    });

    it('CA-05 (SPEC-014): admin con userId ajeno → 200 (bypass)', async () => {
      getUserStatisticsUseCase.execute.mockResolvedValue(mockUserStatistics);
      const result = await controller.getUserStatistics('otro-usuario', { id: 'admin-1', role: 'admin' } as any, tracking);
      expect(getUserStatisticsUseCase.execute).toHaveBeenCalledWith('otro-usuario', tracking);
      expect(result).toEqual(mockUserStatistics);
    });
  });

  describe('getSystemStatistics', () => {
    it('debe retornar las estadísticas del sistema delegando en el use case', async () => {
      getSystemStatisticsUseCase.execute.mockResolvedValue(mockSystemStatistics);

      const result = await controller.getSystemStatistics(tracking);

      expect(getSystemStatisticsUseCase.execute).toHaveBeenCalledWith(tracking);
      expect(result).toEqual(mockSystemStatistics);
    });

    it('debe registrar la traza del GET /statistics/system', async () => {
      getSystemStatisticsUseCase.execute.mockResolvedValue(mockSystemStatistics);

      await controller.getSystemStatistics(tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'GET /statistics/system',
        expect.any(Object),
      );
    });
  });
});
