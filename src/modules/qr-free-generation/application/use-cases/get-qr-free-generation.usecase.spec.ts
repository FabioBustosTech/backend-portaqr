import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetQrFreeGenerationUseCase } from './get-qr-free-generation.usecase';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { QR_FREE_GENERATION_GET_PORT } from '../../domain/constants/qr-free-generation.tokens';
import type { ICanGetQrFreeGeneration } from '../../domain/ports/queries/qr-free-generation.port';
import type { QrFreeGeneration } from '../../domain/entities/qr-free-generation.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';

describe('GetQrFreeGenerationUseCase', () => {
  let useCase: GetQrFreeGenerationUseCase;
  let reader: jest.Mocked<ICanGetQrFreeGeneration>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const mockQr: QrFreeGeneration = {
    id: 'qr-free-1',
    email: 'usuario@ejemplo.com',
    information: { typeQr: 'url', data: 'https://ejemplo.com' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetQrFreeGenerationUseCase,
        {
          provide: QR_FREE_GENERATION_GET_PORT,
          useValue: {
            getById: jest.fn(),
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

    useCase = module.get<GetQrFreeGenerationUseCase>(GetQrFreeGenerationUseCase);
    reader = module.get(QR_FREE_GENERATION_GET_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe retornar el QR gratuito cuando existe', async () => {
      reader.getById.mockResolvedValue(mockQr);

      const result = await useCase.execute('qr-free-1', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'GetQrFreeGenerationUseCase - input',
        { id: 'qr-free-1' },
      );
      expect(reader.getById).toHaveBeenCalledWith('qr-free-1', tracking);
      expect(result).toEqual(mockQr);
    });

    it('debe lanzar NotFoundException y registrar warning si el QR no existe', async () => {
      reader.getById.mockResolvedValue(null);

      await expect(useCase.execute('qr-free-1', tracking)).rejects.toThrow(
        NotFoundException,
      );
      await expect(useCase.execute('qr-free-1', tracking)).rejects.toThrow(
        'QR gratuito con ID qr-free-1 no encontrado',
      );
      expect(traceService.warn).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'GetQrFreeGenerationUseCase - not found',
        { id: 'qr-free-1' },
      );
    });

    it('debe propagar el error si el puerto de lectura falla', async () => {
      reader.getById.mockRejectedValue(new Error('DB down'));

      await expect(useCase.execute('qr-free-1', tracking)).rejects.toThrow('DB down');
    });
  });
});