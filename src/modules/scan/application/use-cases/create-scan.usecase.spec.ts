import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CreateScanUseCase } from './create-scan.usecase';
import { CreateScanDto } from '../dto/create-scan.dto';
import { ScanEntity } from '../../domain/entities/scan.entity';
import { SCAN_CREATE_PORT } from '../../domain/constants/scan.tokens';
import { GetQrUseCase } from '../../../qr/application/use-cases/get-qr.usecase';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import type { Scan } from '../../domain/entities/scan.entity';
import type { ICanCreateScan } from '../../domain/ports/queries/scan.port';

describe('CreateScanUseCase', () => {
  let useCase: CreateScanUseCase;
  let creator: jest.Mocked<ICanCreateScan>;
  let traceService: jest.Mocked<TraceService>;
  let getQrUseCase: jest.Mocked<GetQrUseCase>;

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

    useCase = module.get(CreateScanUseCase);
    creator = module.get(SCAN_CREATE_PORT);
    traceService = module.get(TraceService);
    getQrUseCase = module.get(GetQrUseCase);
    // SPEC-009 A9: el QR existe y pertenece a user-1 (dueño real del escaneo)
    getQrUseCase.execute.mockResolvedValue({ idQr: validDto.idQr, userId: 'user-1' } as never);
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

    it('SPEC-009 A9: el userId del body se IGNORA — el dueño real se toma del QR', async () => {
      const minimalDto = { userId: 'user-2' } as CreateScanDto;
      creator.create.mockResolvedValue({ ...mockSavedScan, userId: 'user-1' });

      await useCase.execute(minimalDto, tracking);

      const [scanArg] = creator.create.mock.calls[0];
      expect(scanArg.idQr).toBe('');
      expect(scanArg.userId).toBe('user-1'); // dueño real del QR (mock), no 'user-2' del body
      expect(scanArg.origen).toBe('desconocido');
      expect(scanArg.successful).toBe(true);
      expect(scanArg.location).toBeUndefined();
      expect(scanArg.device).toBeUndefined();
    });

    it('SPEC-009 A9: lanza NotFoundException si el QR no existe (no crea documento)', async () => {
      getQrUseCase.execute.mockRejectedValue(new NotFoundException('QR no encontrado'));
      creator.create.mockResolvedValue(mockSavedScan);

      await expect(useCase.execute(validDto, tracking)).rejects.toThrow(NotFoundException);
      expect(creator.create).not.toHaveBeenCalled();
    });

    it('debe registrar trazas de entrada y de creación', async () => {
      creator.create.mockResolvedValue(mockSavedScan);

      await useCase.execute(validDto, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'CreateScanUseCase - input',
        expect.objectContaining({ idQr: validDto.idQr }),
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
