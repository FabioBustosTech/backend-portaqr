import { Test, TestingModule } from '@nestjs/testing';
import { CreateQrFreeGenerationUseCase } from './create-qr-free-generation.usecase';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { QR_FREE_GENERATION_CREATE_PORT } from '../../domain/constants/qr-free-generation.tokens';
import type { ICanCreateQrFreeGeneration } from '../../domain/ports/queries/qr-free-generation.port';
import { QrFreeGenerationEntity } from '../../domain/entities/qr-free-generation.entity';
import type { QrFreeGeneration } from '../../domain/entities/qr-free-generation.entity';
import { CreateQrFreeGenerationDto } from '../dto/create-qr-free-generation.dto';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';

describe('CreateQrFreeGenerationUseCase', () => {
  let useCase: CreateQrFreeGenerationUseCase;
  let creator: jest.Mocked<ICanCreateQrFreeGeneration>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const dto: CreateQrFreeGenerationDto = {
    email: 'usuario@ejemplo.com',
    information: { typeQr: 'url', data: 'https://ejemplo.com' },
    location: { latitude: 40.7128, longitude: -74.006, country: 'España', city: 'Madrid' },
    device: { platform: 'iOS', browser: 'Safari', isMobile: true },
  };

  const mockSaved: QrFreeGeneration = {
    id: 'qr-free-1',
    email: 'usuario@ejemplo.com',
    information: { typeQr: 'url', data: 'https://ejemplo.com' },
    location: { latitude: 40.7128, longitude: -74.006, country: 'España', city: 'Madrid' },
    device: { platform: 'iOS', browser: 'Safari', isMobile: true },
    createdAt: new Date('2024-01-01T10:00:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateQrFreeGenerationUseCase,
        {
          provide: QR_FREE_GENERATION_CREATE_PORT,
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

    useCase = module.get<CreateQrFreeGenerationUseCase>(CreateQrFreeGenerationUseCase);
    creator = module.get(QR_FREE_GENERATION_CREATE_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe crear la entidad, delegar al puerto y retornar el QR guardado', async () => {
      creator.create.mockResolvedValue(mockSaved);

      const result = await useCase.execute(dto, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'CreateQrFreeGenerationUseCase - input',
        { email: dto.email, typeQr: dto.information?.typeQr },
      );
      expect(creator.create).toHaveBeenCalledTimes(1);
      const createdEntity = creator.create.mock.calls[0][0];
      expect(createdEntity).toBeInstanceOf(QrFreeGenerationEntity);
      expect(createdEntity.email).toBe('usuario@ejemplo.com');
      expect(createdEntity.information).toEqual(dto.information);
      expect(createdEntity.location).toEqual(dto.location);
      expect(createdEntity.device).toEqual(dto.device);
      expect(creator.create).toHaveBeenCalledWith(createdEntity, tracking);
      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'CreateQrFreeGenerationUseCase - created',
        { id: mockSaved.id },
      );
      expect(result).toEqual(mockSaved);
    });

    it('debe crear la entidad con valores por defecto cuando faltan campos opcionales', async () => {
      const dtoMinimo: CreateQrFreeGenerationDto = {
        email: 'otro@ejemplo.com',
        information: { typeQr: 'text', data: 'Hola' },
      };
      creator.create.mockResolvedValue({
        ...mockSaved,
        email: 'otro@ejemplo.com',
        information: { typeQr: 'text', data: 'Hola' },
      });

      await useCase.execute(dtoMinimo, tracking);

      const createdEntity = creator.create.mock.calls[0][0];
      expect(createdEntity.location).toBeUndefined();
      expect(createdEntity.device).toBeUndefined();
    });

    it('debe propagar el error si el puerto de creación falla', async () => {
      creator.create.mockRejectedValue(new Error('DB down'));

      await expect(useCase.execute(dto, tracking)).rejects.toThrow('DB down');
    });
  });
});