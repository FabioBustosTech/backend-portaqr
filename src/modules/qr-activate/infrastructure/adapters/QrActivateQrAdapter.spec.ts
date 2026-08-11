import { Test, TestingModule } from '@nestjs/testing';
import { QrActivateQrAdapter } from './QrActivateQrAdapter';
import { UpdateQrUseCase } from '../../../qr/application/use-cases/update-qr.usecase';
import { ActivateManyQrsUseCase } from '../../../qr/application/use-cases/activate-many-qrs.usecase';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';

describe('QrActivateQrAdapter', () => {
  let adapter: QrActivateQrAdapter;
  let updateQrUseCase: jest.Mocked<UpdateQrUseCase>;
  let activateManyQrsUseCase: jest.Mocked<ActivateManyQrsUseCase>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QrActivateQrAdapter,
        {
          provide: UpdateQrUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: ActivateManyQrsUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    adapter = module.get(QrActivateQrAdapter);
    updateQrUseCase = module.get(UpdateQrUseCase);
    activateManyQrsUseCase = module.get(ActivateManyQrsUseCase);
  });

  it('debe estar definido', () => {
    expect(adapter).toBeDefined();
  });

  describe('updateQr', () => {
    it('debe delegar la activación del QR al caso de uso de qr', async () => {
      updateQrUseCase.execute.mockResolvedValue({} as never);

      await adapter.updateQr('qr-1', { active: true }, tracking);

      expect(updateQrUseCase.execute).toHaveBeenCalledWith(
        'qr-1',
        { active: true },
        tracking,
      );
    });

    it('debe propagar la fecha de expiración cuando viene', async () => {
      const expiration = new Date('2025-08-01T12:00:00.000Z');
      updateQrUseCase.execute.mockResolvedValue({} as never);

      await adapter.updateQr('qr-2', { active: false, expiration }, tracking);

      expect(updateQrUseCase.execute).toHaveBeenCalledWith(
        'qr-2',
        { active: false, expiration },
        tracking,
      );
    });

    it('debe propagar el error si el caso de uso falla', async () => {
      updateQrUseCase.execute.mockRejectedValue(new Error('QR no encontrado'));

      await expect(adapter.updateQr('qr-1', { active: true }, tracking)).rejects.toThrow(
        'QR no encontrado',
      );
    });
  });

  describe('activateMany', () => {
    it('debe delegar la activación batch al use-case ActivateManyQrs', async () => {
      activateManyQrsUseCase.execute.mockResolvedValue({ matchedCount: 3, modifiedCount: 3 });

      const codes = ['qr-1', 'qr-2', 'qr-3'];
      const expiration = new Date('2026-08-11T00:00:00.000Z');
      const result = await adapter.activateMany(codes, expiration, tracking);

      expect(activateManyQrsUseCase.execute).toHaveBeenCalledWith(codes, expiration, tracking);
      expect(result).toEqual({ matchedCount: 3, modifiedCount: 3 });
    });

    it('debe propagar matchedCount menor cuando hay QRs inexistentes', async () => {
      activateManyQrsUseCase.execute.mockResolvedValue({ matchedCount: 2, modifiedCount: 2 });

      const result = await adapter.activateMany(
        ['qr-1', 'qr-2', 'qr-inexistente'],
        new Date(),
        tracking,
      );

      expect(result).toEqual({ matchedCount: 2, modifiedCount: 2 });
    });

    it('debe propagar el error si el use-case falla', async () => {
      activateManyQrsUseCase.execute.mockRejectedValue(new Error('DB down'));

      await expect(
        adapter.activateMany(['qr-1'], new Date(), tracking),
      ).rejects.toThrow('DB down');
    });
  });
});
