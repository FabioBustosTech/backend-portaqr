import type { Qr } from '../../entities/qr.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';

export interface QrPagination {
  total: number;
  totalPages: number;
  currentPage: number | string;
  limit: number | string;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ICanGetAllQr {
  getAll(tracking: TrackingContext): Promise<Qr[]>;
  findAllWithSearch(
    page: number,
    limit: number,
    search: string,
    tracking: TrackingContext,
  ): Promise<{ data: Qr[]; pagination: QrPagination }>;
}

export interface ICanGetQr {
  getById(id: string, tracking: TrackingContext): Promise<Qr | null>;
  getRecentActive(limit: number, tracking: TrackingContext): Promise<Qr[]>;
  findByUserId(userId: string, tracking: TrackingContext): Promise<Qr[]>;
  findPaginatedByUser(
    userId: string,
    page: number,
    limit: number,
    search: string,
    tracking: TrackingContext,
  ): Promise<{ data: Qr[]; pagination: QrPagination }>;
  findUserByFavorites(
    userId: string,
    page: number,
    limit: number,
    search: string,
    role: string,
    userId2: string,
    tracking: TrackingContext,
  ): Promise<{ data: unknown[]; pagination: QrPagination }>;
}

export interface ICanCreateQr {
  create(qr: Qr, tracking: TrackingContext): Promise<Qr>;
}

export interface ICanUpdateQr {
  update(id: string, data: Partial<Qr>, tracking: TrackingContext): Promise<Qr | null>;
  activateMany(
    qrCodes: string[],
    expiration: Date,
    tracking: TrackingContext,
  ): Promise<{ matchedCount: number; modifiedCount: number }>;
  // SPEC-014: desactivación admin con trazabilidad (motivo obligatorio)
  deactivate(
    id: string,
    reason: string,
    actorId: string,
    tracking: TrackingContext,
  ): Promise<Qr | null>;
}

export interface ICanDeleteQr {
  delete(id: string, tracking: TrackingContext): Promise<boolean>;
}
