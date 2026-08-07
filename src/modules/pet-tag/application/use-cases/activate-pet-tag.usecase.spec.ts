import { Test, TestingModule } from '@nestjs/testing';
import { ActivatePetTagUseCase } from './activate-pet-tag.usecase';
import { PET_TAG_UPDATE_PORT } from '../../domain/constants/pet-tag.tokens';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { ICanUpdatePetTag } from '../../domain/ports/queries/pet-tag.port';
import type { PetData } from '../../domain/entities/pet-tag.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';

describe('ActivatePetTagUseCase', () => {
  let useCase: ActivatePetTagUseCase;
  let activator: jest.Mocked<ICanUpdatePetTag>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const petData: PetData = {
    ownerName: 'Juan Pérez',
    address: 'Av. Siempre Viva 123',
    phone: '+56912345678',
    petName: 'Fido',
    species: 'Perro',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivatePetTagUseCase,
        {
          provide: PET_TAG_UPDATE_PORT,
          useValue: {
            update: jest.fn(),
            activate: jest.fn(),
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

    useCase = module.get(ActivatePetTagUseCase);
    activator = module.get(PET_TAG_UPDATE_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe activar la placa delegando al puerto y retornar el resultado', async () => {
      const expected = { id: 'pet-tag-1', status: 'ACTIVO', userId: 'user-1' };
      activator.activate.mockResolvedValue(expected);

      const result = await useCase.execute(
        'qr-123',
        'A4B1C9',
        petData,
        'user-1',
        tracking,
      );

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'ActivatePetTagUseCase - input',
        { idQr: 'qr-123', userId: 'user-1' },
      );
      expect(activator.activate).toHaveBeenCalledWith(
        'qr-123',
        'A4B1C9',
        petData,
        'user-1',
        tracking,
      );
      expect(result).toEqual(expected);
    });

    it('debe propagar errores lanzados por el puerto', async () => {
      activator.activate.mockRejectedValue(new Error('PIN de activación inválido'));

      await expect(
        useCase.execute('qr-123', 'BADPIN', petData, 'user-1', tracking),
      ).rejects.toThrow('PIN de activación inválido');
    });
  });
});
