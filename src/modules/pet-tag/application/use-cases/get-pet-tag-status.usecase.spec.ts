import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetPetTagStatusUseCase } from './get-pet-tag-status.usecase';
import { PET_TAG_GET_PORT } from '../../domain/constants/pet-tag.tokens';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { ICanGetPetTag } from '../../domain/ports/queries/pet-tag.port';
import type { PetData } from '../../domain/entities/pet-tag.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';

describe('GetPetTagStatusUseCase', () => {
  let useCase: GetPetTagStatusUseCase;
  let reader: jest.Mocked<ICanGetPetTag>;
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
        GetPetTagStatusUseCase,
        {
          provide: PET_TAG_GET_PORT,
          useValue: {
            findReserved: jest.fn(),
            getStatus: jest.fn(),
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

    useCase = module.get(GetPetTagStatusUseCase);
    reader = module.get(PET_TAG_GET_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe retornar el estado y los datos de la placa cuando existe', async () => {
      const expected = { status: 'ACTIVO', petData };
      reader.getStatus.mockResolvedValue(expected);

      const result = await useCase.execute('qr-123', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'GetPetTagStatusUseCase - input',
        { idQr: 'qr-123' },
      );
      expect(reader.getStatus).toHaveBeenCalledWith('qr-123', tracking);
      expect(result).toEqual(expected);
    });

    it('debe retornar el estado aunque no tenga datos de mascota', async () => {
      reader.getStatus.mockResolvedValue({ status: 'RESERVADO' });

      const result = await useCase.execute('qr-123', tracking);

      expect(result).toEqual({ status: 'RESERVADO' });
    });

    it('debe lanzar NotFoundException cuando la placa no existe', async () => {
      reader.getStatus.mockResolvedValue(null);

      await expect(useCase.execute('qr-inexistente', tracking)).rejects.toThrow(
        NotFoundException,
      );
      await expect(useCase.execute('qr-inexistente', tracking)).rejects.toThrow(
        'No se encontró una placa con ID QR: qr-inexistente',
      );
      expect(traceService.warn).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'GetPetTagStatusUseCase - not found',
        { idQr: 'qr-inexistente' },
      );
    });

    it('debe propagar errores lanzados por el puerto', async () => {
      reader.getStatus.mockRejectedValue(new Error('Error de base de datos'));

      await expect(useCase.execute('qr-123', tracking)).rejects.toThrow(
        'Error de base de datos',
      );
    });
  });
});