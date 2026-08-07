import { Test, TestingModule } from '@nestjs/testing';
import { PetTagController } from './pet-tag.controller';
import { GeneratePetTagsUseCase } from '../../application/use-cases/generate-pet-tags.usecase';
import { GetReservedPetTagsUseCase } from '../../application/use-cases/get-reserved-pet-tags.usecase';
import { GetPetTagStatusUseCase } from '../../application/use-cases/get-pet-tag-status.usecase';
import { UpdatePetTagUseCase } from '../../application/use-cases/update-pet-tag.usecase';
import { ActivatePetTagUseCase } from '../../application/use-cases/activate-pet-tag.usecase';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import type { GeneratePetTagsDto } from '../../application/dto/generate-pet-tags.dto';
import type { QueryReservedTagsDto } from '../../application/dto/query-reserved-tags.dto';
import type { UpdatePetTagDto } from '../../application/dto/update-pet-tag.dto';
import type { ActivatePetTagDto } from '../../application/dto/activate-pet-tag.dto';
import { CommercialStatus } from '../../domain/enums/commercial-status.enum';
import type { PetData } from '../../domain/entities/pet-tag.entity';

describe('PetTagController', () => {
  let controller: PetTagController;
  let generatePetTagsUseCase: jest.Mocked<GeneratePetTagsUseCase>;
  let getReservedPetTagsUseCase: jest.Mocked<GetReservedPetTagsUseCase>;
  let getPetTagStatusUseCase: jest.Mocked<GetPetTagStatusUseCase>;
  let updatePetTagUseCase: jest.Mocked<UpdatePetTagUseCase>;
  let activatePetTagUseCase: jest.Mocked<ActivatePetTagUseCase>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };
  const user = { id: 'user-1', role: 'user' };

  const petData: PetData = {
    ownerName: 'Juan',
    address: 'Av. Siempre Viva 123',
    phone: '+56912345678',
    petName: 'Fido',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PetTagController,
        {
          provide: GeneratePetTagsUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetReservedPetTagsUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetPetTagStatusUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: UpdatePetTagUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ActivatePetTagUseCase,
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

    controller = module.get(PetTagController);
    generatePetTagsUseCase = module.get(GeneratePetTagsUseCase);
    getReservedPetTagsUseCase = module.get(GetReservedPetTagsUseCase);
    getPetTagStatusUseCase = module.get(GetPetTagStatusUseCase);
    updatePetTagUseCase = module.get(UpdatePetTagUseCase);
    activatePetTagUseCase = module.get(ActivatePetTagUseCase);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('generatePetTags', () => {
    it('debe generar un lote de placas y delegar al use-case', async () => {
      const dto: GeneratePetTagsDto = { quantity: 5, assignedStoreName: 'Mi Comercio' };
      const expected = [{ qrId: 'qr-1', activationPin: 'A1B2C3', assignedStoreName: 'Mi Comercio' }];
      generatePetTagsUseCase.execute.mockResolvedValue(expected);

      const result = await controller.generatePetTags(dto, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'POST /pet-tag/admin/generate',
        { quantity: 5 },
      );
      expect(generatePetTagsUseCase.execute).toHaveBeenCalledWith(5, 'Mi Comercio', tracking);
      expect(result).toEqual(expected);
    });

    it('debe usar una cadena vacía como comercio cuando no se entrega assignedStoreName', async () => {
      const dto: GeneratePetTagsDto = { quantity: 3 };
      generatePetTagsUseCase.execute.mockResolvedValue([]);

      await controller.generatePetTags(dto, tracking);

      expect(generatePetTagsUseCase.execute).toHaveBeenCalledWith(3, '', tracking);
    });
  });

  describe('getReservedPetTags', () => {
    it('debe consultar las placas reservadas y delegar al use-case', async () => {
      const queryDto: QueryReservedTagsDto = { page: 1, limit: 100, search: 'qr' };
      const expected = {
        data: [],
        pagination: { total: 0, page: 1, limit: 100, totalPages: 0 },
      };
      getReservedPetTagsUseCase.execute.mockResolvedValue(expected);

      const result = await controller.getReservedPetTags(queryDto, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'GET /pet-tag/admin/reserved',
        { queryDto },
      );
      expect(getReservedPetTagsUseCase.execute).toHaveBeenCalledWith(queryDto, tracking);
      expect(result).toEqual(expected);
    });
  });

  describe('getPetTagStatus', () => {
    it('debe consultar el estado de una placa y delegar al use-case', async () => {
      const expected = { status: 'ACTIVO', petData };
      getPetTagStatusUseCase.execute.mockResolvedValue(expected);

      const result = await controller.getPetTagStatus('qr-123', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'GET /pet-tag/public/status/:idQr',
        { idQr: 'qr-123' },
      );
      expect(getPetTagStatusUseCase.execute).toHaveBeenCalledWith('qr-123', tracking);
      expect(result).toEqual(expected);
    });
  });

  describe('updatePetTag', () => {
    it('debe actualizar una placa por petTagId y delegar al use-case', async () => {
      const updateDto: UpdatePetTagDto = { name: 'Placa de Fido', isFavorite: true };
      const expected = { idQr: 'qr-123', name: 'Placa de Fido' };
      updatePetTagUseCase.execute.mockResolvedValue(expected);

      const result = await controller.updatePetTag('pet-tag-1', updateDto, user, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'PATCH /pet-tag/update/:petTagId',
        { petTagId: 'pet-tag-1', userId: 'user-1' },
      );
      expect(updatePetTagUseCase.execute).toHaveBeenCalledWith(
        'pet-tag-1',
        'user-1',
        updateDto,
        tracking,
      );
      expect(result).toEqual(expected);
    });
  });

  describe('activatePetTag', () => {
    it('debe activar una placa y delegar al use-case', async () => {
      const activateDto: ActivatePetTagDto = {
        idQr: 'qr-123',
        activationPin: 'A1B2C3',
        petData,
      };
      const expected = { idQr: 'qr-123', status: 'ACTIVO' };
      activatePetTagUseCase.execute.mockResolvedValue(expected);

      const result = await controller.activatePetTag(activateDto, user, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'PATCH /pet-tag/activate',
        { idQr: 'qr-123', userId: 'user-1' },
      );
      expect(activatePetTagUseCase.execute).toHaveBeenCalledWith(
        'qr-123',
        'A1B2C3',
        petData,
        'user-1',
        tracking,
      );
      expect(result).toEqual(expected);
    });
  });

  describe('updatePetTagByQrId', () => {
    it('debe actualizar una placa por idQr y delegar al use-case', async () => {
      const updateDto: UpdatePetTagDto = { commercialStatus: CommercialStatus.EN_BODEGA };
      const expected = { idQr: 'qr-123', commercialStatus: 'EN_BODEGA' };
      updatePetTagUseCase.execute.mockResolvedValue(expected);

      const result = await controller.updatePetTagByQrId('qr-123', updateDto, user, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'PATCH /pet-tag/:idQr',
        { idQr: 'qr-123', userId: 'user-1' },
      );
      expect(updatePetTagUseCase.execute).toHaveBeenCalledWith(
        'qr-123',
        'user-1',
        updateDto,
        tracking,
      );
      expect(result).toEqual(expected);
    });
  });
});