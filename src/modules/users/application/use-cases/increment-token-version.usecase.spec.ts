import { Test, TestingModule } from '@nestjs/testing';
import { IncrementTokenVersionUseCase } from './increment-token-version.usecase';
import { USER_UPDATE_PORT } from '../../domain/constants/user.tokens';
import type { ICanUpdateUser } from '../../domain/ports/queries/create-user.port';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';

describe('IncrementTokenVersionUseCase', () => {
  let useCase: IncrementTokenVersionUseCase;
  let updater: jest.Mocked<ICanUpdateUser>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncrementTokenVersionUseCase,
        {
          provide: USER_UPDATE_PORT,
          useValue: {
            update: jest.fn(),
            updateLastLogin: jest.fn(),
            incrementTokenVersion: jest.fn(),
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

    useCase = module.get(IncrementTokenVersionUseCase);
    updater = module.get(USER_UPDATE_PORT) as jest.Mocked<ICanUpdateUser>;
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  it('debe incrementar el tokenVersion del usuario a través del puerto', async () => {
    updater.incrementTokenVersion.mockResolvedValue(undefined);

    await useCase.execute('user-1', tracking);

    expect(traceService.log).toHaveBeenCalledWith(
      tracking,
      TraceLayer.USE_CASE,
      'IncrementTokenVersionUseCase',
      { userId: 'user-1' },
    );
    expect(updater.incrementTokenVersion).toHaveBeenCalledWith('user-1', tracking);
  });

  it('debe propagar errores del puerto', async () => {
    updater.incrementTokenVersion.mockRejectedValue(new Error('DB down'));

    await expect(useCase.execute('user-1', tracking)).rejects.toThrow('DB down');
  });
});
