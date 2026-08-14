import type { PetData } from '../../entities/pet-tag.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';

export interface GeneratedPetTagResult {
  qrId: string;
  activationPin: string;
  assignedStoreName: string | null;
}

export interface ReservedTagsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  commercialStatus?: string;
  storeName?: string;
  startDate?: string;
  endDate?: string;
}

export interface ReservedTagsResult {
  data: unknown[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ICanGeneratePetTag {
  generateBatch(
    quantity: number,
    assignedStoreName: string,
    tracking: TrackingContext,
  ): Promise<GeneratedPetTagResult[]>;
}

export interface ICanGetPetTag {
  findReserved(
    query: ReservedTagsQuery,
    tracking: TrackingContext,
  ): Promise<ReservedTagsResult>;
  getStatus(
    idQr: string,
    tracking: TrackingContext,
  ): Promise<{ status?: string; petData?: PetData } | null>;
}

export interface ICanUpdatePetTag {
  update(
    petTagIdQr: string,
    userId: string,
    data: { petData?: PetData; name?: string; isFavorite?: boolean; commercialStatus?: string },
    tracking: TrackingContext,
  ): Promise<unknown>;
  activate(
    idQr: string,
    activationPin: string,
    petData: PetData,
    userId: string,
    tracking: TrackingContext,
  ): Promise<unknown>;
  /**
   * SPEC-016 RF-3: persiste SOLO el sub-campo petData.petImageUrl (URL pública de la foto)
   * sin pisar el resto del petData. 1 round-trip (findOneAndUpdate + $set del sub-campo).
   * url = null → limpia el campo (borrado de foto).
   */
  setPetImageUrl(
    idQr: string,
    userId: string,
    url: string | null,
    tracking: TrackingContext,
  ): Promise<unknown>;
}
