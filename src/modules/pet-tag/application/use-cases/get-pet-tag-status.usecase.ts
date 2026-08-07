import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ICanGetPetTag } from '../../domain/ports/queries/pet-tag.port';
import type { PetData } from '../../domain/entities/pet-tag.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { PET_TAG_GET_PORT } from '../../domain/constants/pet-tag.tokens';

@Injectable()
export class GetPetTagStatusUseCase {
  constructor(
    @Inject(PET_TAG_GET_PORT)
    private readonly reader: ICanGetPetTag,
    private readonly traceService: TraceService,
  ) {}

  async execute(
    idQr: string,
    tracking: TrackingContext,
  ): Promise<{ status?: string; petData?: PetData }> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'GetPetTagStatusUseCase - input', { idQr });

    const tag = await this.reader.getStatus(idQr, tracking);
    if (!tag) {
      this.traceService.warn(tracking, TraceLayer.USE_CASE, 'GetPetTagStatusUseCase - not found', {
        idQr,
      });
      throw new NotFoundException(`No se encontró una placa con ID QR: ${idQr}`);
    }
    return tag; // Devuelve { status: '...', petData: '...' }
  }
}
