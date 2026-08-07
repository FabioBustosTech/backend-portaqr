import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, MongooseHealthIndicator } from '@nestjs/terminus';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  const mockHealthCheckService = {
    check: jest.fn(),
  };

  const mockMongooseHealthIndicator = {
    pingCheck: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: MongooseHealthIndicator, useValue: mockMongooseHealthIndicator },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check (CA-01)', () => {
    it('debe reportar mongodb up cuando la BD responde', async () => {
      mockMongooseHealthIndicator.pingCheck.mockResolvedValue({ mongodb: { status: 'up' } });
      mockHealthCheckService.check.mockImplementation((checks) => Promise.all(checks.map((c) => c())));

      const result = await controller.check();

      expect(mockMongooseHealthIndicator.pingCheck).toHaveBeenCalledWith('mongodb');
      expect(result).toEqual([{ mongodb: { status: 'up' } }]);
    });

    it('debe propagar el estado down cuando la BD no responde', async () => {
      mockMongooseHealthIndicator.pingCheck.mockRejectedValue(new Error('connection refused'));
      mockHealthCheckService.check.mockImplementation((checks) => Promise.all(checks.map((c) => c())));

      await expect(controller.check()).rejects.toThrow('connection refused');
    });
  });
});