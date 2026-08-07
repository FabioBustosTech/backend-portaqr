import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UpdateQrUseCase } from './update-qr.usecase';
import type { ICanUpdateQr } from '../../domain/ports/queries/qr.port';
import { QR_UPDATE_PORT } from '../../domain/constants/qr.tokens';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import type { Qr } from '../../domain/entities/qr.entity';
import type { CreateQrDto } from '../dto/create-qr.dto';

describe('UpdateQrUseCase', () => {
  let useCase: UpdateQrUseCase;
  let updater: jest.Mocked<ICanUpdateQr>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };
  const id = 'qr-id-1';

  const mockQr: Qr = {
    id,
    idQr: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'user-1',
    name: 'QR de prueba',
    description: 'Descripción de prueba',
    active: true,
    isFavorite: false,
    isOldMode: false,
    typeQr: 'dynamic',
    data: { typeQr: 'dynamic', url: 'https://example.com' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateQrUseCase,
        {
          provide: QR_UPDATE_PORT,
          useValue: {
            update: jest.fn(),
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

    useCase = module.get(UpdateQrUseCase);
    updater = module.get(QR_UPDATE_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe actualizar el QR a través del port y retornar el resultado', async () => {
      const dto: Partial<CreateQrDto> = { name: 'Nuevo nombre' };
      updater.update.mockResolvedValue({ ...mockQr, name: 'Nuevo nombre' });

      const result = await useCase.execute(id, dto, tracking);

      expect(updater.update).toHaveBeenCalledWith(id, dto, tracking);
      expect(result.name).toBe('Nuevo nombre');
      expect(result.id).toBe(id);
    });

    it('debe lanzar NotFoundException si el port retorna null', async () => {
      const dto: Partial<CreateQrDto> = { name: 'Nuevo nombre' };
      updater.update.mockResolvedValue(null);

      await expect(useCase.execute(id, dto, tracking)).rejects.toThrow(
        NotFoundException,
      );
      expect(traceService.warn).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'UpdateQrUseCase - not found',
        { id },
      );
    });

    it('debe registrar el input en el TraceService', async () => {
      updater.update.mockResolvedValue(mockQr);

      await useCase.execute(id, {}, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'UpdateQrUseCase - input',
        { id },
      );
    });

    it('debe propagar errores del port', async () => {
      updater.update.mockRejectedValue(new Error('DB down'));

      await expect(useCase.execute(id, {}, tracking)).rejects.toThrow('DB down');
    });
  });
});
