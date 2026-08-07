import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DeleteUserUseCase } from './delete-user.usecase';
import { USER_DELETE_PORT } from '../../domain/constants/user.tokens';
import type { ICanDeleteUser } from '../../domain/ports/queries/create-user.port';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;
  let deleter: jest.Mocked<ICanDeleteUser>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteUserUseCase,
        {
          provide: USER_DELETE_PORT,
          useValue: {
            delete: jest.fn(),
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

    useCase = module.get(DeleteUserUseCase);
    deleter = module.get(USER_DELETE_PORT) as jest.Mocked<ICanDeleteUser>;
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe eliminar el usuario cuando existe', async () => {
      deleter.delete.mockResolvedValue(true);

      await useCase.execute('user-1', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'DeleteUserUseCase',
        { id: 'user-1' },
      );
      expect(deleter.delete).toHaveBeenCalledWith('user-1', tracking);
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      deleter.delete.mockResolvedValue(false);

      await expect(useCase.execute('user-1', tracking)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});