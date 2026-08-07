import { Test, TestingModule } from '@nestjs/testing';
import { GeneratePetTagsUseCase } from './generate-pet-tags.usecase';
import { PET_TAG_CREATE_PORT } from '../../domain/constants/pet-tag.tokens';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type {
  ICanGeneratePetTag,
  GeneratedPetTagResult,
} from '../../domain/ports/queries/pet-tag.port';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';

describe('GeneratePetTagsUseCase', () => {
  let useCase: GeneratePetTagsUseCase;
  let generator: jest.Mocked<ICanGeneratePetTag>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const mockResults: GeneratedPetTagResult[] = [
    { qrId: 'qr-1', activationPin: 'A1B2C3', assignedStoreName: 'Mi Comercio' },
    { qrId: 'qr-2', activationPin: 'D4E5F6', assignedStoreName: 'Mi Comercio' },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeneratePetTagsUseCase,
        {
          provide: PET_TAG_CREATE_PORT,
          useValue: {
            generateBatch: jest.fn(),
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

    useCase = module.get(GeneratePetTagsUseCase);
    generator = module.get(PET_TAG_CREATE_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe generar el lote de placas delegando al puerto y retornar el resultado', async () => {
      generator.generateBatch.mockResolvedValue(mockResults);

      const result = await useCase.execute(2, 'Mi Comercio', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'GeneratePetTagsUseCase - input',
        { quantity: 2, assignedStoreName: 'Mi Comercio' },
      );
      expect(generator.generateBatch).toHaveBeenCalledWith(2, 'Mi Comercio', tracking);
      expect(result).toEqual(mockResults);
    });

    it('debe retornar un arreglo vacío cuando no se genera ninguna placa', async () => {
      generator.generateBatch.mockResolvedValue([]);

      const result = await useCase.execute(0, '', tracking);

      expect(generator.generateBatch).toHaveBeenCalledWith(0, '', tracking);
      expect(result).toEqual([]);
    });

    it('debe propagar errores lanzados por el puerto', async () => {
      generator.generateBatch.mockRejectedValue(new Error('No se pudo generar el lote'));

      await expect(useCase.execute(5, 'Tienda', tracking)).rejects.toThrow(
        'No se pudo generar el lote',
      );
    });
  });
});
