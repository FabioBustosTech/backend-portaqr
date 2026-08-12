import type { QrActivate } from '../../entities/qr-activate.entity';
import type { PaginatedResult } from '../../../../../common/dto/pagination.dto';
import type { TrackingContext } from '../../../../../common/decorators/tracking.decorator';

export interface ICanCreateQrActivate {
  create(activation: QrActivate, tracking: TrackingContext): Promise<QrActivate>;
}

export interface ICanGetQrActivate {
  getAll(
    page: number,
    limit: number,
    search: string | undefined,
    methodActivation: string | undefined,
    userId: string | undefined,
    tracking: TrackingContext,
  ): Promise<PaginatedResult<QrActivate>>;
  getById(id: string, tracking: TrackingContext): Promise<QrActivate | null>;
  getByWebpayToken(token: string, tracking: TrackingContext): Promise<QrActivate | null>;
}

export interface ICanUpdateQrActivate {
  update(
    id: string,
    data: Partial<QrActivate>,
    tracking: TrackingContext,
  ): Promise<QrActivate | null>;
}

export interface ICanDeleteQrActivate {
  delete(id: string, tracking: TrackingContext): Promise<boolean>;
}

/** Puerto para activar QRs (implementado por el módulo qr) */
export interface ICanActivateQr {
  updateQr(
    idQr: string,
    data: { active: boolean; expiration?: Date },
    tracking: TrackingContext,
  ): Promise<void>;
  activateMany(
    qrCodes: string[],
    expiration: Date,
    tracking: TrackingContext,
  ): Promise<{ matchedCount: number; modifiedCount: number }>;
}
