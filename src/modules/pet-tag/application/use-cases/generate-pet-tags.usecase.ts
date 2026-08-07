import { Injectable, Inject } from '@nestjs/common';
import type { ICanGeneratePetTag, GeneratedPetTagResult } from '../../domain/ports/queries/pet-tag.port';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { PET_TAG_CREATE_PORT } from '../../domain/constants/pet-tag.tokens';

@Injectable()
export class GeneratePetTagsUseCase {
  constructor(
    @Inject(PET_TAG_CREATE_PORT)
    private readonly generator: ICanGeneratePetTag,
    private readonly traceService: TraceService,
  ) {}

  async execute(
    quantity: number,
    assignedStoreName: string,
    tracking: TrackingContext,
  ): Promise<GeneratedPetTagResult[]> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'GeneratePetTagsUseCase - input', {
      quantity,
      assignedStoreName,
    });
    return this.generator.generateBatch(quantity, assignedStoreName, tracking);
  }
}
