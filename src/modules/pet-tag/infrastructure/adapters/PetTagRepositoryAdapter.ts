import { Injectable } from '@nestjs/common';
import type { PetData } from '../../domain/entities/pet-tag.entity';
import type {
  ICanGeneratePetTag,
  ICanGetPetTag,
  ICanUpdatePetTag,
  GeneratedPetTagResult,
  ReservedTagsQuery,
  ReservedTagsResult,
} from '../../domain/ports/queries/pet-tag.port';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { MongoPetTagRepository } from '../repository/mongo/mongo-pet-tag.repository';

@Injectable()
export class PetTagRepositoryAdapter
  implements ICanGeneratePetTag, ICanGetPetTag, ICanUpdatePetTag
{
  constructor(private readonly mongoRepository: MongoPetTagRepository) {}

  async generateBatch(
    quantity: number,
    assignedStoreName: string,
    tracking: TrackingContext,
  ): Promise<GeneratedPetTagResult[]> {
    return this.mongoRepository.generateBatch(quantity, assignedStoreName, tracking);
  }

  async findReserved(
    query: ReservedTagsQuery,
    tracking: TrackingContext,
  ): Promise<ReservedTagsResult> {
    return this.mongoRepository.findReserved(query, tracking);
  }

  async getStatus(
    idQr: string,
    tracking: TrackingContext,
  ): Promise<{ status?: string; petData?: PetData } | null> {
    return this.mongoRepository.getStatus(idQr, tracking);
  }

  async getOwner(
    idQr: string,
    tracking: TrackingContext,
  ): Promise<{ userId: string | null } | null> {
    return this.mongoRepository.getOwner(idQr, tracking);
  }

  async update(
    petTagIdQr: string,
    userId: string,
    data: { petData?: PetData; name?: string; isFavorite?: boolean; commercialStatus?: string },
    tracking: TrackingContext,
  ): Promise<unknown> {
    return this.mongoRepository.update(petTagIdQr, userId, data, tracking);
  }

  async activate(
    idQr: string,
    activationPin: string,
    petData: PetData,
    userId: string,
    tracking: TrackingContext,
  ): Promise<unknown> {
    return this.mongoRepository.activate(idQr, activationPin, petData, userId, tracking);
  }

  async setPetImageUrl(
    idQr: string,
    userId: string | null,
    url: string | null,
    tracking: TrackingContext,
  ): Promise<unknown> {
    return this.mongoRepository.setPetImageUrl(idQr, userId, url, tracking);
  }
}
