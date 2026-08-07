import { Injectable, Inject } from '@nestjs/common';
import type { ICanGetPetTag, ReservedTagsQuery, ReservedTagsResult } from '../../domain/ports/queries/pet-tag.port';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { PET_TAG_GET_PORT } from '../../domain/constants/pet-tag.tokens';

@Injectable()
export class GetReservedPetTagsUseCase {
  constructor(
    @Inject(PET_TAG_GET_PORT)
    private readonly reader: ICanGetPetTag,
    private readonly traceService: TraceService,
  ) {}

  async execute(query: ReservedTagsQuery, tracking: TrackingContext): Promise<ReservedTagsResult> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'GetReservedPetTagsUseCase - input', {
      query,
    });
    return this.reader.findReserved(query, tracking);
  }
}
