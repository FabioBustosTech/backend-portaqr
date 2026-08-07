import { Test, TestingModule } from '@nestjs/testing';
import { GetAllQrFreeGenerationUseCase } from './get-all-qr-free-generation.usecase';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { QR_FREE_GENERATION_GET_ALL_PORT } from '../../domain/constants/qr-free-generation.tokens';
import type { ICanGetAllQrFreeGeneration } from '../../domain/ports/queries/qr-free-generation.port';
import type { PaginatedQrFreeGenerations } from '../../domain/entities/qr-free-generation.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';

describe('GetAllQrFreeGenerationUseCase', () => {
  let useCase: GetAllQrFreeGenerationUseCase;
  let reader: jest.Mocked<ICanGetAllQrFreeGeneration>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const mockPaginated: PaginatedQrFreeGenerations = {
    items: [
      {
        id: 'qr-free-1',
        email: 'usuario@ejemplo.com',
        information: { typeQr: 'url', data: 'https://ejemplo.com' },
      },
    ],
    total: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllQrFreeGenerationUseCase,
        {
          provide: QR_FREE_GENERATION_GET_ALL_PORT,
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

    useCase = module.get<GetAllQrFreeGenerationUseCase>(GetAllQrFreeGenerationUseCase);
    reader = module.get(QR_FREE_GENERATION_GET_ALL_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe retornar los QRs gratuitos paginados', async () => {
      reader.getAll.mockResolvedValue(mockPaginated);

      const result = await useCase.execute(1, 10, 'usuario', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'GetAllQrFreeGenerationUseCase - input',
        { page: 1, limit: 10, search: 'usuario' },
      );
      expect(reader.getAll).toHaveBeenCalledWith(1, 10, 'usuario', tracking);
      expect(result).toEqual(mockPaginated);
    });

    it('debe delegar correctamente con búsqueda vacía', async () => {
      reader.getAll.mockResolvedValue(mockPaginated);

      await useCase.execute(2, 5, '', tracking);

      expect(reader.getAll).toHaveBeenCalledWith(2, 5, '', tracking);
    });

    it('debe propagar el error si el puerto de lectura falla', async () => {
      reader.getAll.mockRejectedValue(new Error('DB down'));

      await expect(useCase.execute(1, 10, '', tracking)).rejects.toThrow('DB down');
    });
  });
});