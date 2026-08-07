import { Test, TestingModule } from '@nestjs/testing';
import { UpdatePetTagUseCase } from './update-pet-tag.usecase';
import { PET_TAG_UPDATE_PORT } from '../../domain/constants/pet-tag.tokens';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { ICanUpdatePetTag } from '../../domain/ports/queries/pet-tag.port';
import type { PetData } from '../../domain/entities/pet-tag.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';

describe('UpdatePetTagUseCase', () => {
  let useCase: UpdatePetTagUseCase;
  let updater: jest.Mocked<ICanUpdatePetTag>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const petData: PetData = {
    ownerName: 'Juan Pérez',
    address: 'Av. Siempre Viva 123',
    phone: '+56912345678',
    petName: 'Fido',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdatePetTagUseCase,
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

    useCase = module.get(UpdatePetTagUseCase);
    updater = module.get(PET_TAG_UPDATE_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe actualizar la placa delegando al puerto y retornar el resultado', async () => {
      const expected = { idQr: 'qr-123', name: 'Placa de Fido', status: 'ACTIVO' };
      updater.update.mockResolvedValue(expected);

      const result = await useCase.execute('qr-123', 'user-1', { name: 'Placa de Fido' }, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'UpdatePetTagUseCase - input',
        { petTagIdQr: 'qr-123', userId: 'user-1' },
      );
      expect(updater.update).toHaveBeenCalledWith(
        'qr-123',
        'user-1',
        { name: 'Placa de Fido' },
        tracking,
      );
      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'UpdatePetTagUseCase - updated',
        { petTagIdQr: 'qr-123' },
      );
      expect(result).toEqual(expected);
    });

    it('debe actualizar con datos de mascota, favorito y estado comercial', async () => {
      const data = {
        petData,
        isFavorite: true,
        commercialStatus: 'VENDIDO',
      };
      updater.update.mockResolvedValue({ idQr: 'qr-123', ...data });

      const result = await useCase.execute('qr-123', 'user-1', data, tracking);

      expect(updater.update).toHaveBeenCalledWith('qr-123', 'user-1', data, tracking);
      expect(result).toMatchObject(data);
    });

    it('debe propagar errores lanzados por el puerto', async () => {
      updater.update.mockRejectedValue(new Error('Placa no encontrada'));

      await expect(
        useCase.execute('qr-123', 'user-1', { name: 'X' }, tracking),
      ).rejects.toThrow('Placa no encontrada');
    });
  });
});