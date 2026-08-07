import { Test, TestingModule } from '@nestjs/testing';
import { GetAllUserUseCase } from './get-all-user.usecase';
import { USER_GET_ALL_PORT } from '../../domain/constants/user.tokens';
import type { ICanGetAllUser } from '../../domain/ports/queries/get-user.port';
import type { User } from '../../domain/entities/user.entity';
import type { PaginatedResult } from '../../../../common/dto/pagination.dto';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';

describe('GetAllUserUseCase', () => {
  let useCase: GetAllUserUseCase;
  let reader: jest.Mocked<ICanGetAllUser>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const paginatedResult: PaginatedResult<User> = {
    data: [
      {
        id: 'user-1',
        email: 'a@test.com',
        userName: 'usera',
        firstName: 'Ana',
        paternalLastName: 'Pérez',
        maternalLastName: 'Gómez',
        role: 'user',
        isEmailVerified: true,
      },
    ],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllUserUseCase,
        {
          provide: USER_GET_ALL_PORT,
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

    useCase = module.get(GetAllUserUseCase);
    reader = module.get(USER_GET_ALL_PORT) as jest.Mocked<ICanGetAllUser>;
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe delegar al puerto con los parámetros de paginación y búsqueda', async () => {
      reader.getAll.mockResolvedValue(paginatedResult);

      const result = await useCase.execute(2, 25, 'juan', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'GetAllUserUseCase',
        { page: 2, limit: 25, search: 'juan' },
      );
      expect(reader.getAll).toHaveBeenCalledWith(2, 25, 'juan', tracking);
      expect(result).toEqual(paginatedResult);
    });

    it('debe delegar con search undefined cuando no se proporciona', async () => {
      reader.getAll.mockResolvedValue(paginatedResult);

      await useCase.execute(1, 10, undefined, tracking);

      expect(reader.getAll).toHaveBeenCalledWith(1, 10, undefined, tracking);
    });

    it('debe propagar el error del puerto', async () => {
      reader.getAll.mockRejectedValue(new Error('DB caída'));

      await expect(
        useCase.execute(1, 10, undefined, tracking),
      ).rejects.toThrow('DB caída');
    });
  });
});