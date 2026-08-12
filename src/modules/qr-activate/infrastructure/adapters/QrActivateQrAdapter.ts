import { Injectable } from '@nestjs/common';
import type { ICanActivateQr } from '../../domain/ports/queries/qr-activate.port';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { UpdateQrUseCase } from '../../../qr/application/use-cases/update-qr.usecase';
import { ActivateManyQrsUseCase } from '../../../qr/application/use-cases/activate-many-qrs.usecase';

/**
 * Adaptador: activa QRs usando los casos de uso del módulo qr hexagonal.
 */
@Injectable()
export class QrActivateQrAdapter implements ICanActivateQr {
  constructor(
    private readonly updateQrUseCase: UpdateQrUseCase,
    private readonly activateManyQrsUseCase: ActivateManyQrsUseCase,
  ) {}

  async updateQr(
    idQr: string,
    data: { active: boolean; expiration?: Date },
    tracking: TrackingContext,
  ): Promise<void> {
    await this.updateQrUseCase.execute(idQr, data, tracking);
  }

  async activateMany(
    qrCodes: string[],
    expiration: Date,
    tracking: TrackingContext,
  ): Promise<{ matchedCount: number; modifiedCount: number }> {
    return this.activateManyQrsUseCase.execute(qrCodes, expiration, tracking);
  }
}
