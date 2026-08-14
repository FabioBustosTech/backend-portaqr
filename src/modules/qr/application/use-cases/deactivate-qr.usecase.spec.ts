import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DeactivateQrUseCase } from './deactivate-qr.usecase';
import type { ICanGetQr, ICanUpdateQr } from '../../domain/ports/queries/qr.port';
import type { Qr } from '../../domain/entities/qr.entity';
import { QR_GET_PORT, QR_UPDATE_PORT } from '../../domain/constants/qr.tokens';
import { TraceService } from 'src/common/services/trace.service';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';

const makeQr = (overrides: Partial<Qr> = {}): Qr => ({
  id: 'qr-1',
  idQr: '11111111-1111-1111-1111-111111111111',
  userId: 'user-1',
  data: { typeQr: 'dynamic', url: 'https://example.com' },
  typeQr: 'dynamic',
  active: true,
  ...overrides,
});

describe('DeactivateQrUseCase (SPEC-014)', () => {
  let useCase: DeactivateQrUseCase;
  let reader: jest.Mocked<ICanGetQr>;
  let updater: jest.Mocked<ICanUpdateQr>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeactivateQrUseCase,
        {
          provide: QR_GET_PORT,
          useValue: { getById: jest.fn() },
        },
        {
          provide: QR_UPDATE_PORT,
          useValue: { deactivate: jest.fn() },
        },
        {
          provide: TraceService,
          useValue: { log: jest.fn(), debug: jest.fn(), error: jest.fn(), warn: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(DeactivateQrUseCase);
    reader = module.get(QR_GET_PORT);
    updater = module.get(QR_UPDATE_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('CA-01: desactiva el QR con motivo y persistencia de trazabilidad', async () => {
      const qr = makeQr({ active: true });
      reader.getById.mockResolvedValue(qr);
      updater.deactivate.mockResolvedValue({
        ...qr,
        active: false,
        expiration: null,
        deactivatedAt: new Date(),
        deactivatedBy: 'admin-1',
        deactivationReason: 'Cliente no renovó el plan',
      });

      const result = await useCase.execute(
        '11111111-1111-1111-1111-111111111111',
        'Cliente no renovó el plan',
        'admin-1',
        tracking,
      );

      expect(reader.getById).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
        tracking,
      );
      expect(updater.deactivate).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
        'Cliente no renovó el plan',
        'admin-1',
        tracking,
      );
      expect(result.active).toBe(false);
      expect(result.deactivationReason).toBe('Cliente no renovó el plan');
      expect(result.deactivatedBy).toBe('admin-1');
      expect(traceService.log).toHaveBeenCalled();
    });

    it('CA-02: lanza 404 si el QR no existe', async () => {
      reader.getById.mockResolvedValue(null);

      await expect(
        useCase.execute('no-existe', 'Motivo de prueba', 'admin-1', tracking),
      ).rejects.toThrow(NotFoundException);
      expect(updater.deactivate).not.toHaveBeenCalled();
    });

    it('CA-02b: lanza 404 si el QR ya está inactivo (no re-desactiva)', async () => {
      reader.getById.mockResolvedValue(makeQr({ active: false }));

      await expect(
        useCase.execute('11111111-1111-1111-1111-111111111111', 'Motivo de prueba', 'admin-1', tracking),
      ).rejects.toThrow(NotFoundException);
      expect(updater.deactivate).not.toHaveBeenCalled();
    });

    it('propaga errores del port', async () => {
      reader.getById.mockResolvedValue(makeQr({ active: true }));
      updater.deactivate.mockRejectedValue(new Error('DB down'));

      await expect(
        useCase.execute('11111111-1111-1111-1111-111111111111', 'Motivo de prueba', 'admin-1', tracking),
      ).rejects.toThrow('DB down');
    });
  });
});
