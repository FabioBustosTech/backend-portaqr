import { Injectable } from '@nestjs/common';
import type { ICanActivateQr } from '../../domain/ports/queries/qr-activate.port';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { UpdateQrUseCase } from '../../../qr/application/use-cases/update-qr.usecase';

/**
 * Adaptador: activa QRs usando el caso de uso del módulo qr hexagonal.
 */
@Injectable()
export class QrActivateQrAdapter implements ICanActivateQr {
  constructor(private readonly updateQrUseCase: UpdateQrUseCase) {}

  async updateQr(
    idQr: string,
    data: { active: boolean; expiration?: Date },
    tracking: TrackingContext,
  ): Promise<void> {
    await this.updateQrUseCase.execute(idQr, data, tracking);
  }
}
