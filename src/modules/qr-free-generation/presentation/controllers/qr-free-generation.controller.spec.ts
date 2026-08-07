import { Test, TestingModule } from '@nestjs/testing';
import { QrFreeGenerationController } from './qr-free-generation.controller';
import { CreateQrFreeGenerationUseCase } from '../../application/use-cases/create-qr-free-generation.usecase';
import { GetAllQrFreeGenerationUseCase } from '../../application/use-cases/get-all-qr-free-generation.usecase';
import { GetQrFreeGenerationUseCase } from '../../application/use-cases/get-qr-free-generation.usecase';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import type { QrFreeGeneration } from '../../domain/entities/qr-free-generation.entity';
import type { PaginatedQrFreeGenerations } from '../../domain/entities/qr-free-generation.entity';
import { CreateQrFreeGenerationDto } from '../../application/dto/create-qr-free-generation.dto';

describe('QrFreeGenerationController', () => {
  let controller: QrFreeGenerationController;
  let createQrFreeGenerationUseCase: jest.Mocked<CreateQrFreeGenerationUseCase>;
  let getAllQrFreeGenerationUseCase: jest.Mocked<GetAllQrFreeGenerationUseCase>;
  let getQrFreeGenerationUseCase: jest.Mocked<GetQrFreeGenerationUseCase>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const mockQr: QrFreeGeneration = {
    id: 'qr-free-1',
    email: 'usuario@ejemplo.com',
    information: { typeQr: 'url', data: 'https://ejemplo.com' },
  };

  const mockPaginated: PaginatedQrFreeGenerations = {
    items: [mockQr],
    total: 1,
  };

  const createDto: CreateQrFreeGenerationDto = {
    email: 'usuario@ejemplo.com',
    information: { typeQr: 'url', data: 'https://ejemplo.com' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QrFreeGenerationController],
      providers: [
        {
          provide: CreateQrFreeGenerationUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: GetAllQrFreeGenerationUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: GetQrFreeGenerationUseCase,
          useValue: {
            execute: jest.fn(),
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

    controller = module.get<QrFreeGenerationController>(QrFreeGenerationController);
    createQrFreeGenerationUseCase = module.get(CreateQrFreeGenerationUseCase);
    getAllQrFreeGenerationUseCase = module.get(GetAllQrFreeGenerationUseCase);
    getQrFreeGenerationUseCase = module.get(GetQrFreeGenerationUseCase);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('debe delegar la creación al use case y retornar el QR creado', async () => {
      createQrFreeGenerationUseCase.execute.mockResolvedValue(mockQr);

      const result = await controller.create(createDto, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'POST /qr-free-generation',
        { email: createDto.email },
      );
      expect(createQrFreeGenerationUseCase.execute).toHaveBeenCalledWith(
        createDto,
        tracking,
      );
      expect(result).toEqual(mockQr);
    });
  });

  describe('findAll', () => {
    it('debe delegar la paginación al use case', async () => {
      getAllQrFreeGenerationUseCase.execute.mockResolvedValue(mockPaginated);

      const result = await controller.findAll(1, 10, 'usuario', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'GET /qr-free-generation',
        { page: 1, limit: 10, search: 'usuario' },
      );
      expect(getAllQrFreeGenerationUseCase.execute).toHaveBeenCalledWith(
        1,
        10,
        'usuario',
        tracking,
      );
      expect(result).toEqual(mockPaginated);
    });

    it('debe delegar con valores por defecto cuando no se envían query params', async () => {
      getAllQrFreeGenerationUseCase.execute.mockResolvedValue(mockPaginated);

      await controller.findAll(undefined as never, undefined as never, undefined as never, tracking);

      expect(getAllQrFreeGenerationUseCase.execute).toHaveBeenCalledWith(
        1,
        10,
        '',
        tracking,
      );
    });
  });

  describe('findOne', () => {
    it('debe delegar la búsqueda por ID al use case', async () => {
      getQrFreeGenerationUseCase.execute.mockResolvedValue(mockQr);

      const result = await controller.findOne('qr-free-1', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'GET /qr-free-generation/:id',
        { id: 'qr-free-1' },
      );
      expect(getQrFreeGenerationUseCase.execute).toHaveBeenCalledWith(
        'qr-free-1',
        tracking,
      );
      expect(result).toEqual(mockQr);
    });
  });
});