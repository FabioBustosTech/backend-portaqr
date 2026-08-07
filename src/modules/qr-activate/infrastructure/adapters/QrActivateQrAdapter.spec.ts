import { Test, TestingModule } from '@nestjs/testing';
import { QrActivateQrAdapter } from './QrActivateQrAdapter';
import { UpdateQrUseCase } from '../../../qr/application/use-cases/update-qr.usecase';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';

describe('QrActivateQrAdapter', () => {
  let adapter: QrActivateQrAdapter;
  let updateQrUseCase: jest.Mocked<UpdateQrUseCase>;

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
      ],
    }).compile();

    adapter = module.get(QrActivateQrAdapter);
    updateQrUseCase = module.get(UpdateQrUseCase);
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
});