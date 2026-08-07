import { Injectable } from '@nestjs/common';
import type { ICanActivateQr } from '../../domain/ports/queries/qr-activate.port';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { QrService } from '../../../../qr/qr.service';

/**
 * Adaptador temporal: activa QRs usando el QrService legacy.
 * Cuando el mÃ³dulo qr se migre a hexagonal, este adapter
 * apuntarÃ¡ al nuevo puerto de qr sin tocar el caso de uso.
 */
@Injectable()
export class QrActivateQrAdapter implements ICanActivateQr {
  constructor(private readonly qrService: QrService) {}

  async updateQr(
    idQr: string,
    data: { active: boolean; expiration?: Date },
    tracking: TrackingContext,
  ): Promise<void> {
    await this.qrService.update(idQr, data, tracking.trackingId);
  }
}
