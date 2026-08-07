import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ICanGetQrFreeGeneration } from '../../domain/ports/queries/qr-free-generation.port';
import type { QrFreeGeneration } from '../../domain/entities/qr-free-generation.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { QR_FREE_GENERATION_GET_PORT } from '../../domain/constants/qr-free-generation.tokens';

@Injectable()
export class GetQrFreeGenerationUseCase {
  constructor(
    @Inject(QR_FREE_GENERATION_GET_PORT)
    private readonly reader: ICanGetQrFreeGeneration,
    private readonly traceService: TraceService,
  ) {}

  async execute(id: string, tracking: TrackingContext): Promise<QrFreeGeneration> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'GetQrFreeGenerationUseCase - input', {
      id,
    });

    const qr = await this.reader.getById(id, tracking);
    if (!qr) {
      this.traceService.warn(tracking, TraceLayer.USE_CASE, 'GetQrFreeGenerationUseCase - not found', {
        id,
      });
      throw new NotFoundException(`QR gratuito con ID ${id} no encontrado`);
    }
    return qr;
  }
}
