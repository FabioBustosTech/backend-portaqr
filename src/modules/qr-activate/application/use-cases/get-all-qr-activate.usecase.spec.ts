import { Test, TestingModule } from '@nestjs/testing';
import { GetAllQrActivateUseCase } from './get-all-qr-activate.usecase';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { QR_ACTIVATE_GET_PORT } from '../../domain/constants/qr-activate.tokens';
import type { ICanGetQrActivate } from '../../domain/ports/queries/qr-activate.port';
import type { PaginatedResult } from '../../../../common/dto/pagination.dto';
import {
  MethodActivation,
  ActivationState,
  DocumentType,
} from '../../domain/entities/qr-activate.entity';
import type { QrActivate } from '../../domain/entities/qr-activate.entity';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';

describe('GetAllQrActivateUseCase', () => {
  let useCase: GetAllQrActivateUseCase;
  let reader: jest.Mocked<ICanGetQrActivate>;
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllQrActivateUseCase,
        {
          provide: QR_ACTIVATE_GET_PORT,
          useValue: {
            getAll: jest.fn(),
            getById: jest.fn(),
            getByWebpayToken: jest.fn(),
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

    useCase = module.get<GetAllQrActivateUseCase>(GetAllQrActivateUseCase);
    reader = module.get(QR_ACTIVATE_GET_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe retornar las activaciones paginadas con todos los filtros', async () => {
      reader.getAll.mockResolvedValue(mockPaginated);

      const result = await useCase.execute(1, 10, 'user', 'WEBPAY', tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'GetAllQrActivateUseCase',
        { page: 1, limit: 10, search: 'user', methodActivation: 'WEBPAY' },
      );
      expect(reader.getAll).toHaveBeenCalledWith(1, 10, 'user', 'WEBPAY', tracking);
      expect(result).toEqual(mockPaginated);
    });

    it('debe delegar correctamente cuando los filtros son undefined', async () => {
      reader.getAll.mockResolvedValue(mockPaginated);

      const result = await useCase.execute(2, 5, undefined, undefined, tracking);

      expect(reader.getAll).toHaveBeenCalledWith(2, 5, undefined, undefined, tracking);
      expect(result).toEqual(mockPaginated);
    });

    it('debe propagar el error si el puerto de lectura falla', async () => {
      reader.getAll.mockRejectedValue(new Error('DB down'));

      await expect(
        useCase.execute(1, 10, '', undefined, tracking),
      ).rejects.toThrow('DB down');
    });
  });
});