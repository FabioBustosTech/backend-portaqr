import { Injectable, Inject } from '@nestjs/common';
import type { ICanCreateQrFreeGeneration } from '../../domain/ports/queries/qr-free-generation.port';
import { QrFreeGenerationEntity } from '../../domain/entities/qr-free-generation.entity';
import type { QrFreeGeneration } from '../../domain/entities/qr-free-generation.entity';
import { CreateQrFreeGenerationDto } from '../dto/create-qr-free-generation.dto';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { QR_FREE_GENERATION_CREATE_PORT } from '../../domain/constants/qr-free-generation.tokens';

@Injectable()
export class CreateQrFreeGenerationUseCase {
  constructor(
    @Inject(QR_FREE_GENERATION_CREATE_PORT)
    private readonly creator: ICanCreateQrFreeGeneration,
    private readonly traceService: TraceService,
  ) {}

  async execute(dto: CreateQrFreeGenerationDto, tracking: TrackingContext): Promise<QrFreeGeneration> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'CreateQrFreeGenerationUseCase - input', {
      email: dto.email,
      typeQr: dto.information?.typeQr,
    });

    const qrFreeGeneration = new QrFreeGenerationEntity({
      email: dto.email,
      information: dto.information,
      location: dto.location,
      device: dto.device,
    });

    const saved = await this.creator.create(qrFreeGeneration, tracking);
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'CreateQrFreeGenerationUseCase - created', {
      id: saved.id,
    });
    return saved;
  }
}
