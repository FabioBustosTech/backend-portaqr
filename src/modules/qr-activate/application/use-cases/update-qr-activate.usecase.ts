import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ICanUpdateQrActivate, ICanGetQrActivate } from '../../domain/ports/queries/qr-activate.port';
import type { QrActivate } from '../../domain/entities/qr-activate.entity';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { QR_ACTIVATE_UPDATE_PORT } from '../../domain/constants/qr-activate.tokens';
import { UpdateQrActivateDto } from '../dto/update-qr-activate.dto';

@Injectable()
export class UpdateQrActivateUseCase {
  constructor(
    @Inject(QR_ACTIVATE_UPDATE_PORT)
    private readonly updater: ICanUpdateQrActivate,
    private readonly traceService: TraceService,
  ) {}

  async execute(
    id: string,
    dto: UpdateQrActivateDto,
    tracking: TrackingContext,
  ): Promise<QrActivate> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'UpdateQrActivateUseCase', { id });

    const updated = await this.updater.update(id, dto as Partial<QrActivate>, tracking);
    if (!updated) {
      throw new NotFoundException(`Activación con ID ${id} no encontrada`);
    }
    return updated;
  }
}
