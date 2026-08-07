import { Test, TestingModule } from '@nestjs/testing';
import { CreateQrUseCase } from './create-qr.usecase';
import type { ICanCreateQr } from '../../domain/ports/queries/qr.port';
import { QR_CREATE_PORT } from '../../domain/constants/qr.tokens';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import type { Qr } from '../../domain/entities/qr.entity';
import { CreateQrDto, QrType } from '../dto/create-qr.dto';

describe('CreateQrUseCase', () => {
  let useCase: CreateQrUseCase;
  let creator: jest.Mocked<ICanCreateQr>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const dto: CreateQrDto = {
    idQr: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'user-1',
    name: 'QR de prueba',
    description: 'Descripción de prueba',
    active: true,
    isFavorite: false,
    isOldMode: false,
    typeQr: QrType.DYNAMIC,
    data: { typeQr: QrType.DYNAMIC, url: 'https://example.com' },
  };

  const mockQr: Qr = {
    id: 'qr-id-1',
    idQr: dto.idQr,
    userId: dto.userId,
    name: dto.name,
    description: dto.description,
    active: true,
    isFavorite: false,
    isOldMode: false,
    typeQr: dto.typeQr,
    data: { typeQr: QrType.DYNAMIC, url: 'https://example.com' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateQrUseCase,
        {
          provide: QR_CREATE_PORT,
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

    useCase = module.get(CreateQrUseCase);
    creator = module.get(QR_CREATE_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe crear el QR a través del port y retornar el resultado', async () => {
      creator.create.mockResolvedValue(mockQr);

      const result = await useCase.execute(dto, tracking);

      expect(creator.create).toHaveBeenCalledWith(
        expect.objectContaining({
          idQr: dto.idQr,
          userId: dto.userId,
          typeQr: dto.typeQr,
          name: dto.name,
          description: dto.description,
          active: true,
          isFavorite: false,
          isOldMode: false,
          data: dto.data,
        }),
        tracking,
      );
      expect(result).toEqual(mockQr);
    });

    it('debe aplicar valores por defecto (active, isFavorite, isOldMode = false) cuando no se envían', async () => {
      const dtoSinOpcionales: CreateQrDto = {
        idQr: '123e4567-e89b-12d3-a456-426614174001',
        userId: 'user-1',
        typeQr: QrType.STATIC,
        data: { typeQr: QrType.STATIC, url: 'https://example.org' },
      };
      creator.create.mockResolvedValue(mockQr);

      await useCase.execute(dtoSinOpcionales, tracking);

      expect(creator.create).toHaveBeenCalledWith(
        expect.objectContaining({
          active: false,
          isFavorite: false,
          isOldMode: false,
        }),
        tracking,
      );
    });

    it('debe registrar el input y el resultado en el TraceService', async () => {
      creator.create.mockResolvedValue(mockQr);

      await useCase.execute(dto, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'CreateQrUseCase - input',
        { idQr: dto.idQr, userId: dto.userId, typeQr: dto.typeQr },
      );
      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'CreateQrUseCase - created',
        { id: mockQr.id, idQr: mockQr.idQr },
      );
    });

    it('debe propagar errores del port', async () => {
      creator.create.mockRejectedValue(new Error('DB down'));

      await expect(useCase.execute(dto, tracking)).rejects.toThrow('DB down');
      expect(creator.create).toHaveBeenCalled();
    });
  });
});
