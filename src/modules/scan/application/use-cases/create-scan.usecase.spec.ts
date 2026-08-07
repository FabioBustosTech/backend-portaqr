import { Test, TestingModule } from '@nestjs/testing';
import { CreateScanUseCase } from './create-scan.usecase';
import { CreateScanDto } from '../dto/create-scan.dto';
import { ScanEntity } from '../../domain/entities/scan.entity';
import { SCAN_CREATE_PORT } from '../../domain/constants/scan.tokens';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import type { Scan } from '../../domain/entities/scan.entity';
import type { ICanCreateScan } from '../../domain/ports/queries/scan.port';

describe('CreateScanUseCase', () => {
  let useCase: CreateScanUseCase;
  let creator: jest.Mocked<ICanCreateScan>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const validDto: CreateScanDto = {
    idQr: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'user-1',
    location: { latitude: 40.7128, longitude: -74.006, city: 'New York' },
    device: { platform: 'iOS', browser: 'Safari', isMobile: true },
    origen: 'web',
    successful: true,
    userIdScan: 'scan-user-1',
    lastScanId: 'last-1',
  } as CreateScanDto;

  const mockSavedScan: Scan = {
    id: 'scan-id-1',
    idQr: validDto.idQr,
    scanDate: new Date('2024-01-01T00:00:00Z'),
    location: validDto.location,
    origen: 'web',
    device: validDto.device,
    successful: true,
    userIdScan: 'scan-user-1',
    lastScanId: 'last-1',
    userId: 'user-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateScanUseCase,
        {
          provide: SCAN_CREATE_PORT,
          useValue: {
            create: jest.fn(),
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

    useCase = module.get(CreateScanUseCase);
    creator = module.get(SCAN_CREATE_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe construir un ScanEntity con los datos del DTO y delegar en el puerto', async () => {
      creator.create.mockResolvedValue(mockSavedScan);

      const result = await useCase.execute(validDto, tracking);

      expect(creator.create).toHaveBeenCalledTimes(1);
      expect(creator.create).toHaveBeenCalledWith(expect.any(ScanEntity), tracking);

      const [scanArg] = creator.create.mock.calls[0];
      expect(scanArg).toBeInstanceOf(ScanEntity);
      expect(scanArg.idQr).toBe(validDto.idQr);
      expect(scanArg.userId).toBe(validDto.userId);
      expect(scanArg.location).toEqual(validDto.location);
      expect(scanArg.device).toEqual(validDto.device);
      expect(scanArg.origen).toBe('web');
      expect(scanArg.successful).toBe(true);
      expect(scanArg.userIdScan).toBe('scan-user-1');
      expect(scanArg.lastScanId).toBe('last-1');

      expect(result).toEqual(mockSavedScan);
    });

    it('debe aplicar valores por defecto de ScanEntity cuando el DTO omite campos opcionales', async () => {
      const minimalDto = { userId: 'user-2' } as CreateScanDto;
      creator.create.mockResolvedValue({ ...mockSavedScan, userId: 'user-2' });

      await useCase.execute(minimalDto, tracking);

      const [scanArg] = creator.create.mock.calls[0];
      expect(scanArg.idQr).toBe('');
      expect(scanArg.userId).toBe('user-2');
      expect(scanArg.origen).toBe('desconocido');
      expect(scanArg.successful).toBe(true);
      expect(scanArg.location).toBeUndefined();
      expect(scanArg.device).toBeUndefined();
    });

    it('debe registrar trazas de entrada y de creación', async () => {
      creator.create.mockResolvedValue(mockSavedScan);

      await useCase.execute(validDto, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'CreateScanUseCase - input',
        expect.objectContaining({ idQr: validDto.idQr, userId: validDto.userId }),
      );
      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'CreateScanUseCase - created',
        expect.objectContaining({ id: mockSavedScan.id, idQr: mockSavedScan.idQr }),
      );
    });

    it('debe propagar errores del puerto', async () => {
      const error = new Error('DB down');
      creator.create.mockRejectedValue(error);

      await expect(useCase.execute(validDto, tracking)).rejects.toThrow('DB down');
    });
  });
});
