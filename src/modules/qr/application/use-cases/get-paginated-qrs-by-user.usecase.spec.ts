import { Test, TestingModule } from '@nestjs/testing';
import { GetPaginatedQrsByUserUseCase } from './get-paginated-qrs-by-user.usecase';
import type { ICanGetQr, QrPagination } from '../../domain/ports/queries/qr.port';
import { QR_GET_PORT } from '../../domain/constants/qr.tokens';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import type { Qr } from '../../domain/entities/qr.entity';

describe('GetPaginatedQrsByUserUseCase', () => {
  let useCase: GetPaginatedQrsByUserUseCase;
  let reader: jest.Mocked<ICanGetQr>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };
  const userId = 'user-1';

  const mockQr: Qr = {
    id: 'qr-id-1',
    idQr: '123e4567-e89b-12d3-a456-426614174000',
    userId,
    name: 'QR de prueba',
    active: true,
    isFavorite: false,
    isOldMode: false,
    typeQr: 'dynamic',
    data: { typeQr: 'dynamic', url: 'https://example.com' },
  };

  const mockPagination: QrPagination = {
    total: 1,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetPaginatedQrsByUserUseCase,
        {
          provide: QR_GET_PORT,
          useValue: {
            getById: jest.fn(),
            getRecentActive: jest.fn(),
            findByUserId: jest.fn(),
            findPaginatedByUser: jest.fn(),
            findUserByFavorites: jest.fn(),
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

    useCase = module.get(GetPaginatedQrsByUserUseCase);
    reader = module.get(QR_GET_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe retornar los QRs paginados del usuario', async () => {
      reader.findPaginatedByUser.mockResolvedValue({
        data: [mockQr],
        pagination: mockPagination,
      });

      const result = await useCase.execute(userId, 2, 5, 'busqueda', tracking);

      expect(reader.findPaginatedByUser).toHaveBeenCalledWith(
        userId,
        2,
        5,
        'busqueda',
        tracking,
      );
      expect(result.data).toEqual([mockQr]);
      expect(result.pagination).toEqual(mockPagination);
    });

    it('debe retornar una página vacía cuando no hay resultados', async () => {
      reader.findPaginatedByUser.mockResolvedValue({
        data: [],
        pagination: { ...mockPagination, total: 0, totalPages: 0 },
      });

      const result = await useCase.execute(userId, 1, 10, '', tracking);

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('debe registrar el input en el TraceService', async () => {
      reader.findPaginatedByUser.mockResolvedValue({
        data: [],
        pagination: mockPagination,
      });

      await useCase.execute(userId, 1, 10, '', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'GetPaginatedQrsByUserUseCase - input',
        { userId, page: 1, limit: 10, search: '' },
      );
    });

    it('debe propagar errores del port', async () => {
      reader.findPaginatedByUser.mockRejectedValue(new Error('DB down'));

      await expect(useCase.execute(userId, 1, 10, '', tracking)).rejects.toThrow(
        'DB down',
      );
    });
  });
});