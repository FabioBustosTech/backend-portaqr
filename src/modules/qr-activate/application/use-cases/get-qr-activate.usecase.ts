import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ICanGetQrActivate } from '../../domain/ports/queries/qr-activate.port';
import type { QrActivate } from '../../domain/entities/qr-activate.entity';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { QR_ACTIVATE_GET_PORT } from '../../domain/constants/qr-activate.tokens';

@Injectable()
export class GetQrActivateUseCase {
  constructor(
    @Inject(QR_ACTIVATE_GET_PORT)
    private readonly reader: ICanGetQrActivate,
    private readonly traceService: TraceService,
  ) {}

  async execute(id: string, tracking: TrackingContext): Promise<QrActivate> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'GetQrActivateUseCase', { id });
    const activation = await this.reader.getById(id, tracking);
    if (!activation) {
      throw new NotFoundException(`Activación con ID ${id} no encontrada`);
    }
    return activation;
  }

  async executeByWebpayToken(token: string, tracking: TrackingContext): Promise<QrActivate | null> {
    return this.reader.getByWebpayToken(token, tracking);
  }
}
