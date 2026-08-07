import { Test, TestingModule } from '@nestjs/testing';
import { GetRecentActiveQrUseCase } from './get-recent-active-qr.usecase';
import type { ICanGetQr } from '../../domain/ports/queries/qr.port';
import { QR_GET_PORT } from '../../domain/constants/qr.tokens';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import type { Qr } from '../../domain/entities/qr.entity';

describe('GetRecentActiveQrUseCase', () => {
  let useCase: GetRecentActiveQrUseCase;
  let reader: jest.Mocked<ICanGetQr>;
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetRecentActiveQrUseCase,
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

    useCase = module.get(GetRecentActiveQrUseCase);
    reader = module.get(QR_GET_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe retornar los QRs activos recientes con el límite indicado', async () => {
      reader.getRecentActive.mockResolvedValue([mockQr]);

      const result = await useCase.execute(500, tracking);

      expect(reader.getRecentActive).toHaveBeenCalledWith(500, tracking);
      expect(result).toEqual([mockQr]);
    });

    it('debe retornar una lista vacía cuando no hay QRs activos', async () => {
      reader.getRecentActive.mockResolvedValue([]);

      const result = await useCase.execute(500, tracking);

      expect(result).toEqual([]);
    });

    it('debe registrar el input en el TraceService', async () => {
      reader.getRecentActive.mockResolvedValue([]);

      await useCase.execute(10, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'GetRecentActiveQrUseCase - input',
        { limit: 10 },
      );
    });

    it('debe propagar errores del port', async () => {
      reader.getRecentActive.mockRejectedValue(new Error('DB down'));

      await expect(useCase.execute(500, tracking)).rejects.toThrow('DB down');
    });
  });
});