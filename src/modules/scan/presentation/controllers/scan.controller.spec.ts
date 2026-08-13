import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScanController } from './scan.controller';
import { CreateScanUseCase } from '../../application/use-cases/create-scan.usecase';
import { GetScanStatsUseCase } from '../../application/use-cases/get-scan-stats.usecase';
import { GetRecentScansUseCase } from '../../application/use-cases/get-recent-scans.usecase';
import { GetDailyScanStatsUseCase } from '../../application/use-cases/get-daily-scan-stats.usecase';
import { GetLocationScanStatsUseCase } from '../../application/use-cases/get-location-scan-stats.usecase';
import { GetDeviceScanStatsUseCase } from '../../application/use-cases/get-device-scan-stats.usecase';
import { GetQrUseCase } from '../../../qr/application/use-cases/get-qr.usecase';
import { CreateScanDto } from '../../application/dto/create-scan.dto';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import type { Scan } from '../../domain/entities/scan.entity';

describe('ScanController', () => {
  let controller: ScanController;
  let createScanUseCase: jest.Mocked<CreateScanUseCase>;
  let getScanStatsUseCase: jest.Mocked<GetScanStatsUseCase>;
  let getRecentScansUseCase: jest.Mocked<GetRecentScansUseCase>;
  let getDailyScanStatsUseCase: jest.Mocked<GetDailyScanStatsUseCase>;
  let getLocationScanStatsUseCase: jest.Mocked<GetLocationScanStatsUseCase>;
  let getDeviceScanStatsUseCase: jest.Mocked<GetDeviceScanStatsUseCase>;
  let traceService: jest.Mocked<TraceService>;
  let getQrUseCase: jest.Mocked<GetQrUseCase>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const createScanDto = {
    idQr: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'user-1',
    location: { latitude: 40.7128, longitude: -74.006, city: 'Madrid' },
  } as CreateScanDto;

  const mockScan: Scan = {
    id: 'scan-1',
    idQr: createScanDto.idQr,
    successful: true,
    userId: 'user-1',
    scanDate: new Date('2024-01-01T10:00:00Z'),
  };

  const mockStats = { total: 100, successful: 90, failed: 10 };
  const mockDailyStats = [{ date: '2024-01-01', total: 10 }];
  const mockLocationStats = [{ city: 'Madrid', count: 50 }];
  const mockDeviceStats = [{ platform: 'iOS', count: 60 }];

  // SPEC-009 A7: el QR del dueño (user-1) para los checks de ownership
  const mockQr = { idQr: 'qr-1', userId: 'user-1', active: true } as never;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      // SPEC-011: el controller usa QrPublicThrottlerGuard → registrar los
      // providers del throttler (THROTTLER:MODULE_OPTIONS + ThrottlerStorage)
      imports: [ThrottlerModule.forRoot({ throttlers: [{ limit: 100, ttl: 60_000 }] })],
      controllers: [ScanController],
      providers: [
        {
          provide: CreateScanUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetScanStatsUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetRecentScansUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetDailyScanStatsUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetLocationScanStatsUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetDeviceScanStatsUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetQrUseCase,
          useValue: { execute: jest.fn() },
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

    controller = module.get(ScanController);
    createScanUseCase = module.get(CreateScanUseCase);
    getScanStatsUseCase = module.get(GetScanStatsUseCase);
    getRecentScansUseCase = module.get(GetRecentScansUseCase);
    getDailyScanStatsUseCase = module.get(GetDailyScanStatsUseCase);
    getLocationScanStatsUseCase = module.get(GetLocationScanStatsUseCase);
    getDeviceScanStatsUseCase = module.get(GetDeviceScanStatsUseCase);
    traceService = module.get(TraceService);
    getQrUseCase = module.get(GetQrUseCase);
    getQrUseCase.execute.mockResolvedValue(mockQr);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('debe delegar el registro del escaneo en el use case y retornar el escaneo creado', async () => {
      createScanUseCase.execute.mockResolvedValue(mockScan);

      const result = await controller.create(createScanDto, tracking);

      expect(createScanUseCase.execute).toHaveBeenCalledWith(createScanDto, tracking);
      expect(result).toEqual(mockScan);
    });

    it('debe registrar la traza del POST /scan/stats con idQr y ciudad', async () => {
      createScanUseCase.execute.mockResolvedValue(mockScan);

      await controller.create(createScanDto, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'POST /scan/stats',
        expect.objectContaining({ idQr: createScanDto.idQr, city: 'Madrid' }),
      );
    });
  });

  describe('getStats', () => {
    it('debe retornar las estadísticas del QR delegando en el use case', async () => {
      getScanStatsUseCase.execute.mockResolvedValue(mockStats);

      const result = await controller.getStats('qr-1', { id: 'user-1', role: 'user' }, tracking);

      expect(getScanStatsUseCase.execute).toHaveBeenCalledWith('qr-1', tracking);
      expect(result).toEqual(mockStats);
    });

    it('debe lanzar NotFoundException y registrar un warning cuando no hay estadísticas', async () => {
      getScanStatsUseCase.execute.mockResolvedValue(null);

      await expect(controller.getStats('qr-inexistente', { id: 'user-1', role: 'user' }, tracking)).rejects.toThrow(
        NotFoundException,
      );

      expect(traceService.warn).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'GET /scan/:idQr/stats - not found',
        expect.objectContaining({ idQr: 'qr-inexistente' }),
      );
    });

    it('debe registrar la traza del GET /scan/:idQr/stats', async () => {
      getScanStatsUseCase.execute.mockResolvedValue(mockStats);

      await controller.getStats('qr-1', { id: 'user-1', role: 'user' }, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'GET /scan/:idQr/stats',
        expect.objectContaining({ idQr: 'qr-1' }),
      );
    });
  });

  describe('getRecentScans', () => {
    it('debe retornar los escaneos recientes delegando con el limit recibido', async () => {
      getRecentScansUseCase.execute.mockResolvedValue([mockScan]);

      const result = await controller.getRecentScans('qr-1', 5, { id: 'user-1', role: 'user' }, tracking);

      expect(getRecentScansUseCase.execute).toHaveBeenCalledWith('qr-1', 5, tracking);
      expect(result).toEqual([mockScan]);
    });

    it('debe usar el limit por defecto (10) cuando no se recibe query param', async () => {
      getRecentScansUseCase.execute.mockResolvedValue([]);

      const result = await controller.getRecentScans('qr-1', undefined, { id: 'user-1', role: 'user' }, tracking);

      expect(getRecentScansUseCase.execute).toHaveBeenCalledWith('qr-1', 10, tracking);
      expect(result).toEqual([]);
    });
  });

  describe('getDailyStats', () => {
    it('debe retornar las estadísticas diarias delegando con los días recibidos', async () => {
      getDailyScanStatsUseCase.execute.mockResolvedValue(mockDailyStats);

      const result = await controller.getDailyStats('qr-1', 7, { id: 'user-1', role: 'user' }, tracking);

      expect(getDailyScanStatsUseCase.execute).toHaveBeenCalledWith('qr-1', 7, tracking);
      expect(result).toEqual(mockDailyStats);
    });

    it('debe usar los días por defecto (30) cuando no se recibe query param', async () => {
      getDailyScanStatsUseCase.execute.mockResolvedValue([]);

      const result = await controller.getDailyStats('qr-1', undefined, { id: 'user-1', role: 'user' }, tracking);

      expect(getDailyScanStatsUseCase.execute).toHaveBeenCalledWith('qr-1', 30, tracking);
      expect(result).toEqual([]);
    });
  });

  describe('getLocationStats', () => {
    it('debe retornar las estadísticas de ubicaciones delegando en el use case', async () => {
      getLocationScanStatsUseCase.execute.mockResolvedValue(mockLocationStats);

      const result = await controller.getLocationStats('qr-1', { id: 'user-1', role: 'user' }, tracking);

      expect(getLocationScanStatsUseCase.execute).toHaveBeenCalledWith('qr-1', tracking);
      expect(result).toEqual(mockLocationStats);
    });
  });

  describe('getDeviceStats', () => {
    it('debe retornar las estadísticas de dispositivos delegando en el use case', async () => {
      getDeviceScanStatsUseCase.execute.mockResolvedValue(mockDeviceStats);

      const result = await controller.getDeviceStats('qr-1', { id: 'user-1', role: 'user' }, tracking);

      expect(getDeviceScanStatsUseCase.execute).toHaveBeenCalledWith('qr-1', tracking);
      expect(result).toEqual(mockDeviceStats);
    });
  });
});
