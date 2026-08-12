import { Test, TestingModule } from '@nestjs/testing';
import { QrActivateController } from './qr-activate.controller';
import { CreateQrActivateUseCase } from '../../application/use-cases/create-qr-activate.usecase';
import { GetAllQrActivateUseCase } from '../../application/use-cases/get-all-qr-activate.usecase';
import { GetQrActivateUseCase } from '../../application/use-cases/get-qr-activate.usecase';
import { UpdateQrActivateUseCase } from '../../application/use-cases/update-qr-activate.usecase';
import { UpdateWebpayQrActivateUseCase } from '../../application/use-cases/update-webpay-qr-activate.usecase';
import { DeleteQrActivateUseCase } from '../../application/use-cases/delete-qr-activate.usecase';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import {
  MethodActivation,
  ActivationState,
  DocumentType,
} from '../../domain/entities/qr-activate.entity';
import type { QrActivate } from '../../domain/entities/qr-activate.entity';
import type { PaginatedResult } from '../../../../common/dto/pagination.dto';
import { CreateQrActivateDto } from '../../application/dto/create-qr-activate.dto';
import { UpdateQrActivateDto } from '../../application/dto/update-qr-activate.dto';

describe('QrActivateController', () => {
  let controller: QrActivateController;
  let createQrActivateUseCase: jest.Mocked<CreateQrActivateUseCase>;
  let getAllQrActivateUseCase: jest.Mocked<GetAllQrActivateUseCase>;
  let getQrActivateUseCase: jest.Mocked<GetQrActivateUseCase>;
  let updateQrActivateUseCase: jest.Mocked<UpdateQrActivateUseCase>;
  let updateWebpayQrActivateUseCase: jest.Mocked<UpdateWebpayQrActivateUseCase>;
  let deleteQrActivateUseCase: jest.Mocked<DeleteQrActivateUseCase>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const mockActivation: QrActivate = {
    id: 'act-1',
    methodActivation: MethodActivation.WEBPAY,
    state: ActivationState.PENDING,
    price: { TotalPrice: 100, TotalTax: 19 },
    userId: 'user-1',
    qrList: [],
    documentType: DocumentType.BOLETA,
  };

  const mockPaginated: PaginatedResult<QrActivate> = {
    data: [mockActivation],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  };

  const createDto: CreateQrActivateDto = {
    methodActivation: MethodActivation.WEBPAY,
    price: { TotalPrice: 100, TotalTax: 19 },
    qrList: [
      {
        qrCode: 'qr-1',
        price: 100,
        expirationDate: new Date('2024-12-31'),
        duration: '12 meses',
      },
    ],
    userId: 'user-1',
    documentType: DocumentType.BOLETA,
  };

  const updateDto: UpdateQrActivateDto = {
    description: 'Actualizada',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QrActivateController],
      providers: [
        {
          provide: CreateQrActivateUseCase,
          useValue: {
            execute: jest.fn(),
            executeAdmin: jest.fn(),
          },
        },
        {
          provide: GetAllQrActivateUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: GetQrActivateUseCase,
          useValue: {
            execute: jest.fn(),
            executeByWebpayToken: jest.fn(),
          },
        },
        {
          provide: UpdateQrActivateUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: UpdateWebpayQrActivateUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: DeleteQrActivateUseCase,
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

    controller = module.get<QrActivateController>(QrActivateController);
    createQrActivateUseCase = module.get(CreateQrActivateUseCase);
    getAllQrActivateUseCase = module.get(GetAllQrActivateUseCase);
    getQrActivateUseCase = module.get(GetQrActivateUseCase);
    updateQrActivateUseCase = module.get(UpdateQrActivateUseCase);
    updateWebpayQrActivateUseCase = module.get(UpdateWebpayQrActivateUseCase);
    deleteQrActivateUseCase = module.get(DeleteQrActivateUseCase);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('debe delegar la creación al use-case y retornar la activación', async () => {
      createQrActivateUseCase.execute.mockResolvedValue(mockActivation);

      const result = await controller.create(createDto, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'POST /qr-activate',
        { methodActivation: createDto.methodActivation },
      );
      expect(createQrActivateUseCase.execute).toHaveBeenCalledWith(createDto, tracking);
      expect(result).toEqual(mockActivation);
    });

    it('debe usar executeAdmin cuando methodActivation es ADMIN (SPEC-007 H2: activa QRs en batch)', async () => {
      const adminDto: CreateQrActivateDto = {
        ...createDto,
        methodActivation: MethodActivation.ADMIN,
      };
      createQrActivateUseCase.executeAdmin.mockResolvedValue({
        ...mockActivation,
        methodActivation: MethodActivation.ADMIN,
      });

      const result = await controller.create(adminDto, tracking);

      expect(createQrActivateUseCase.executeAdmin).toHaveBeenCalledWith(adminDto, tracking);
      expect(createQrActivateUseCase.execute).not.toHaveBeenCalled();
      expect(result.methodActivation).toBe(MethodActivation.ADMIN);
    });

    it('debe usar execute (sin activación batch) para WEBPAY', async () => {
      const webpayDto: CreateQrActivateDto = {
        ...createDto,
        methodActivation: MethodActivation.WEBPAY,
      };
      createQrActivateUseCase.execute.mockResolvedValue(mockActivation);

      await controller.create(webpayDto, tracking);

      expect(createQrActivateUseCase.execute).toHaveBeenCalledWith(webpayDto, tracking);
      expect(createQrActivateUseCase.executeAdmin).not.toHaveBeenCalled();
    });

    it('debe usar execute para TRANSFER', async () => {
      const transferDto: CreateQrActivateDto = {
        ...createDto,
        methodActivation: MethodActivation.TRANSFER,
      };
      createQrActivateUseCase.execute.mockResolvedValue(mockActivation);

      await controller.create(transferDto, tracking);

      expect(createQrActivateUseCase.execute).toHaveBeenCalledWith(transferDto, tracking);
      expect(createQrActivateUseCase.executeAdmin).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('debe delegar la paginación al use case con todos los parámetros', async () => {
      getAllQrActivateUseCase.execute.mockResolvedValue(mockPaginated);

      const result = await controller.findAll(1, 10, 'user', tracking, 'WEBPAY');

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'GET /qr-activate',
        { page: 1, limit: 10 },
      );
      expect(getAllQrActivateUseCase.execute).toHaveBeenCalledWith(
        1,
        10,
        'user',
        'WEBPAY',
        tracking,
      );
      expect(result).toEqual(mockPaginated);
    });

    it('debe pasar methodActivation undefined cuando no se envía', async () => {
      getAllQrActivateUseCase.execute.mockResolvedValue(mockPaginated);

      await controller.findAll(1, 10, '', tracking, undefined);

      expect(getAllQrActivateUseCase.execute).toHaveBeenCalledWith(
        1,
        10,
        '',
        undefined,
        tracking,
      );
    });

    it('debe aplicar los valores por defecto cuando no se envían query params', async () => {
      getAllQrActivateUseCase.execute.mockResolvedValue(mockPaginated);

      await controller.findAll(undefined as never, undefined as never, undefined as never, tracking, undefined);

      expect(getAllQrActivateUseCase.execute).toHaveBeenCalledWith(
        1,
        10,
        '',
        undefined,
        tracking,
      );
    });
  });

  describe('findOne', () => {
    it('debe delegar la búsqueda por ID al use case', async () => {
      getQrActivateUseCase.execute.mockResolvedValue(mockActivation);

      const result = await controller.findOne('act-1', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'GET /qr-activate/:id',
        { id: 'act-1' },
      );
      expect(getQrActivateUseCase.execute).toHaveBeenCalledWith('act-1', tracking);
      expect(result).toEqual(mockActivation);
    });
  });

  describe('updateWebpay', () => {
    it('debe delegar la actualización por token de Webpay al use case', async () => {
      updateWebpayQrActivateUseCase.execute.mockResolvedValue(mockActivation);

      const result = await controller.updateWebpay('token-ws-1', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'PATCH /qr-activate/webpay/:token_ws',
        { token_ws: 'token-ws-1' },
      );
      expect(updateWebpayQrActivateUseCase.execute).toHaveBeenCalledWith(
        'token-ws-1',
        tracking,
      );
      expect(result).toEqual(mockActivation);
    });
  });

  describe('update', () => {
    it('debe delegar la actualización al use case', async () => {
      updateQrActivateUseCase.execute.mockResolvedValue(mockActivation);

      const result = await controller.update('act-1', updateDto, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'PATCH /qr-activate/:id',
        { id: 'act-1' },
      );
      expect(updateQrActivateUseCase.execute).toHaveBeenCalledWith(
        'act-1',
        updateDto,
        tracking,
      );
      expect(result).toEqual(mockActivation);
    });
  });

  describe('remove', () => {
    it('debe eliminar la activación y retornar mensaje de éxito', async () => {
      deleteQrActivateUseCase.execute.mockResolvedValue(undefined);

      const result = await controller.remove('act-1', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'DELETE /qr-activate/:id',
        { id: 'act-1' },
      );
      expect(deleteQrActivateUseCase.execute).toHaveBeenCalledWith('act-1', tracking);
      expect(result).toEqual({ message: 'ActivaciÃ³n eliminada exitosamente' });
    });
  });
});