import { Injectable, Inject } from '@nestjs/common';
import type { ICanUpdatePetTag } from '../../domain/ports/queries/pet-tag.port';
import type { PetData } from '../../domain/entities/pet-tag.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { PET_TAG_UPDATE_PORT } from '../../domain/constants/pet-tag.tokens';

export interface UpdatePetTagData {
  petData?: PetData;
  name?: string;
  isFavorite?: boolean;
  commercialStatus?: string;
}

@Injectable()
export class UpdatePetTagUseCase {
  constructor(
    @Inject(PET_TAG_UPDATE_PORT)
    private readonly updater: ICanUpdatePetTag,
    private readonly traceService: TraceService,
  ) {}

  async execute(
    petTagIdQr: string,
    userId: string,
    data: UpdatePetTagData,
    tracking: TrackingContext,
  ): Promise<unknown> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'UpdatePetTagUseCase - input', {
      petTagIdQr,
      userId,
    });

    const tag = await this.updater.update(petTagIdQr, userId, data, tracking);

    this.traceService.log(tracking, TraceLayer.USE_CASE, 'UpdatePetTagUseCase - updated', {
      petTagIdQr,
    });
    return tag;
  }
}
