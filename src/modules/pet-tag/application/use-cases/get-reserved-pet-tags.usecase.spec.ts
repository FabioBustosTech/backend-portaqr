import { Test, TestingModule } from '@nestjs/testing';
import { GetReservedPetTagsUseCase } from './get-reserved-pet-tags.usecase';
import { PET_TAG_GET_PORT } from '../../domain/constants/pet-tag.tokens';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type {
  ICanGetPetTag,
  ReservedTagsQuery,
  ReservedTagsResult,
} from '../../domain/ports/queries/pet-tag.port';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';

describe('GetReservedPetTagsUseCase', () => {
  let useCase: GetReservedPetTagsUseCase;
  let reader: jest.Mocked<ICanGetPetTag>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const mockResult: ReservedTagsResult = {
    data: [{ idQr: 'qr-1', status: 'RESERVADO' }],
    pagination: { total: 1, page: 1, limit: 100, totalPages: 1 },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetReservedPetTagsUseCase,
        {
          provide: PET_TAG_GET_PORT,
          useValue: {
            findReserved: jest.fn(),
            getStatus: jest.fn(),
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

    useCase = module.get(GetReservedPetTagsUseCase);
    reader = module.get(PET_TAG_GET_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe retornar las placas reservadas delegando al puerto', async () => {
      const query: ReservedTagsQuery = {
        page: 1,
        limit: 100,
        search: 'qr-1',
        status: 'RESERVADO',
        commercialStatus: 'EN_BODEGA',
        storeName: 'Mi Comercio',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };
      reader.findReserved.mockResolvedValue(mockResult);

      const result = await useCase.execute(query, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'GetReservedPetTagsUseCase - input',
        { query },
      );
      expect(reader.findReserved).toHaveBeenCalledWith(query, tracking);
      expect(result).toEqual(mockResult);
    });

    it('debe funcionar con una consulta vacía (filtros opcionales)', async () => {
      reader.findReserved.mockResolvedValue({
        data: [],
        pagination: { total: 0, page: 1, limit: 100, totalPages: 0 },
      });

      const result = await useCase.execute({}, tracking);

      expect(reader.findReserved).toHaveBeenCalledWith({}, tracking);
      expect(result.data).toEqual([]);
    });

    it('debe propagar errores lanzados por el puerto', async () => {
      reader.findReserved.mockRejectedValue(new Error('Error al consultar reservas'));

      await expect(useCase.execute({}, tracking)).rejects.toThrow(
        'Error al consultar reservas',
      );
    });
  });
});