import { Test, TestingModule } from '@nestjs/testing';
import { GetRecentScansUseCase } from './get-recent-scans.usecase';
import { SCAN_GET_PORT } from '../../domain/constants/scan.tokens';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import type { Scan } from '../../domain/entities/scan.entity';
import type { ICanGetScan } from '../../domain/ports/queries/scan.port';

describe('GetRecentScansUseCase', () => {
  let useCase: GetRecentScansUseCase;
  let reader: jest.Mocked<ICanGetScan>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const mockScans: Scan[] = [
    {
      id: 'scan-1',
      idQr: 'qr-1',
      successful: true,
      userId: 'u1',
      scanDate: new Date('2024-01-01T10:00:00Z'),
    },
    {
      id: 'scan-2',
      idQr: 'qr-1',
      successful: false,
      errorMessage: 'Código QR inválido',
      userId: 'u1',
      scanDate: new Date('2024-01-01T09:00:00Z'),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetRecentScansUseCase,
        {
          provide: SCAN_GET_PORT,
          useValue: {
            getStatsByQrId: jest.fn(),
            getDailyStats: jest.fn(),
            getDeviceStats: jest.fn(),
            getOriginStats: jest.fn(),
            getLocationStats: jest.fn(),
            getRecentScans: jest.fn(),
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

    useCase = module.get(GetRecentScansUseCase);
    reader = module.get(SCAN_GET_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe retornar los escaneos recientes delegando en el puerto con idQr, limit y tracking', async () => {
      reader.getRecentScans.mockResolvedValue(mockScans);

      const result = await useCase.execute('qr-1', 5, tracking);

      expect(reader.getRecentScans).toHaveBeenCalledWith('qr-1', 5, tracking);
      expect(result).toEqual(mockScans);
    });

    it('debe retornar una lista vacía cuando no hay escaneos registrados', async () => {
      reader.getRecentScans.mockResolvedValue([]);

      const result = await useCase.execute('qr-1', 10, tracking);

      expect(reader.getRecentScans).toHaveBeenCalledWith('qr-1', 10, tracking);
      expect(result).toEqual([]);
    });

    it('debe registrar la traza de entrada con idQr y limit', async () => {
      reader.getRecentScans.mockResolvedValue([]);

      await useCase.execute('qr-1', 10, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'GetRecentScansUseCase - input',
        expect.objectContaining({ idQr: 'qr-1', limit: 10 }),
      );
    });

    it('debe propagar errores del puerto', async () => {
      const error = new Error('DB down');
      reader.getRecentScans.mockRejectedValue(error);

      await expect(useCase.execute('qr-1', 10, tracking)).rejects.toThrow('DB down');
    });
  });
});
