import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ICanUpdateQr } from '../../domain/ports/queries/qr.port';
import type { Qr } from '../../domain/entities/qr.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { QR_UPDATE_PORT } from '../../domain/constants/qr.tokens';
import { CreateQrDto } from '../dto/create-qr.dto';

@Injectable()
export class UpdateQrUseCase {
  constructor(
    @Inject(QR_UPDATE_PORT)
    private readonly updater: ICanUpdateQr,
    private readonly traceService: TraceService,
  ) {}

  async execute(
    id: string,
    dto: Partial<CreateQrDto>,
    tracking: TrackingContext,
  ): Promise<Qr> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'UpdateQrUseCase - input', { id });

    const updated = await this.updater.update(id, dto as Partial<Qr>, tracking);
    if (!updated) {
      this.traceService.warn(tracking, TraceLayer.USE_CASE, 'UpdateQrUseCase - not found', { id });
      throw new NotFoundException(`QR no encontrado: ${id}`);
    }
    return updated;
  }
}
