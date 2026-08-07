import { Injectable, Inject } from '@nestjs/common';
import type { ICanUpdatePetTag } from '../../domain/ports/queries/pet-tag.port';
import type { PetData } from '../../domain/entities/pet-tag.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { PET_TAG_UPDATE_PORT } from '../../domain/constants/pet-tag.tokens';

@Injectable()
export class ActivatePetTagUseCase {
  constructor(
    @Inject(PET_TAG_UPDATE_PORT)
    private readonly activator: ICanUpdatePetTag,
    private readonly traceService: TraceService,
  ) {}

  async execute(
    idQr: string,
    activationPin: string,
    petData: PetData,
    userId: string,
    tracking: TrackingContext,
  ): Promise<unknown> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'ActivatePetTagUseCase - input', {
      idQr,
      userId,
    });

    return this.activator.activate(idQr, activationPin, petData, userId, tracking);
  }
}
