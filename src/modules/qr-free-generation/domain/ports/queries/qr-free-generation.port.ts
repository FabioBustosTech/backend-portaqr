import type { QrFreeGeneration, PaginatedQrFreeGenerations } from '../../entities/qr-free-generation.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';

export interface ICanCreateQrFreeGeneration {
  create(qrFreeGeneration: QrFreeGeneration, tracking: TrackingContext): Promise<QrFreeGeneration>;
}

export interface ICanGetAllQrFreeGeneration {
  getAll(
    page: number,
    limit: number,
    search: string,
    tracking: TrackingContext,
  ): Promise<PaginatedQrFreeGenerations>;
}

export interface ICanGetQrFreeGeneration {
  getById(id: string, tracking: TrackingContext): Promise<QrFreeGeneration | null>;
}
