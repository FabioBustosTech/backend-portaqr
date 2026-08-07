import { Test, TestingModule } from '@nestjs/testing';
import { GetAllQrUseCase } from './get-all-qr.usecase';
import type { ICanGetAllQr, QrPagination } from '../../domain/ports/queries/qr.port';
import { QR_GET_ALL_PORT } from '../../domain/constants/qr.tokens';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import type { Qr } from '../../domain/entities/qr.entity';

describe('GetAllQrUseCase', () => {
  let useCase: GetAllQrUseCase;
  let reader: jest.Mocked<ICanGetAllQr>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const mockQr: Qr = {
    id: 'qr-id-1',
    idQr: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'user-1',
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
        GetAllQrUseCase,
        {
          provide: QR_GET_ALL_PORT,
          useValue: {
            getAll: jest.fn(),
            findAllWithSearch: jest.fn(),
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

    useCase = module.get(GetAllQrUseCase);
    reader = module.get(QR_GET_ALL_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('executeAll', () => {
    it('debe retornar todos los QRs sin paginación', async () => {
      reader.getAll.mockResolvedValue([mockQr]);

      const result = await useCase.executeAll(tracking);

      expect(reader.getAll).toHaveBeenCalledWith(tracking);
      expect(result).toEqual([mockQr]);
    });

    it('debe retornar una lista vacía cuando no hay QRs', async () => {
      reader.getAll.mockResolvedValue([]);

      const result = await useCase.executeAll(tracking);

      expect(result).toEqual([]);
    });

    it('debe registrar el evento en el TraceService', async () => {
      reader.getAll.mockResolvedValue([]);

      await useCase.executeAll(tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'GetAllQrUseCase - all',
      );
    });

    it('debe propagar errores del port', async () => {
      reader.getAll.mockRejectedValue(new Error('DB down'));

      await expect(useCase.executeAll(tracking)).rejects.toThrow('DB down');
    });
  });

  describe('execute', () => {
    it('debe retornar los QRs paginados con búsqueda', async () => {
      reader.findAllWithSearch.mockResolvedValue({
        data: [mockQr],
        pagination: mockPagination,
      });

      const result = await useCase.execute(2, 5, 'busqueda', tracking);

      expect(reader.findAllWithSearch).toHaveBeenCalledWith(
        2,
        5,
        'busqueda',
        tracking,
      );
      expect(result.data).toEqual([mockQr]);
      expect(result.pagination).toEqual(mockPagination);
    });

    it('debe registrar el input en el TraceService', async () => {
      reader.findAllWithSearch.mockResolvedValue({
        data: [],
        pagination: mockPagination,
      });

      await useCase.execute(1, 10, '', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'GetAllQrUseCase - input',
        { page: 1, limit: 10, search: '' },
      );
    });

    it('debe propagar errores del port', async () => {
      reader.findAllWithSearch.mockRejectedValue(new Error('DB down'));

      await expect(useCase.execute(1, 10, '', tracking)).rejects.toThrow(
        'DB down',
      );
    });
  });
});