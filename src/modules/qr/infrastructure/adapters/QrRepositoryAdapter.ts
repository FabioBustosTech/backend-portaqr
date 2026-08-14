import { Injectable } from '@nestjs/common';
import type { Qr } from '../../domain/entities/qr.entity';
import type {
  ICanGetAllQr,
  ICanGetQr,
  ICanCreateQr,
  ICanUpdateQr,
  ICanDeleteQr,
  QrPagination,
} from '../../domain/ports/queries/qr.port';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { MongoQrRepository } from '../repository/mongo/mongo-qr.repository';

@Injectable()
export class QrRepositoryAdapter
  implements ICanGetAllQr, ICanGetQr, ICanCreateQr, ICanUpdateQr, ICanDeleteQr
{
  constructor(private readonly mongoRepository: MongoQrRepository) {}

  async create(qr: Qr, tracking: TrackingContext): Promise<Qr> {
    return this.mongoRepository.create(qr, tracking);
  }

  async getRecentActive(limit: number, tracking: TrackingContext): Promise<Qr[]> {
    return this.mongoRepository.getRecentActive(limit, tracking);
  }

  async getAll(tracking: TrackingContext): Promise<Qr[]> {
    return this.mongoRepository.getAll(tracking);
  }

  async findAllWithSearch(
    page: number,
    limit: number,
    search: string,
    active: string,
    type: string | undefined,
    userId: string | undefined,
    tracking: TrackingContext,
  ): Promise<{ data: Qr[]; pagination: QrPagination }> {
    return this.mongoRepository.findAllWithSearch(page, limit, search, active, type, userId, tracking);
  }

  async getById(id: string, tracking: TrackingContext): Promise<Qr | null> {
    return this.mongoRepository.getById(id, tracking);
  }

  async findByUserId(userId: string, tracking: TrackingContext): Promise<Qr[]> {
    return this.mongoRepository.findByUserId(userId, tracking);
  }

  async update(
    id: string,
    data: Partial<Qr>,
    tracking: TrackingContext,
  ): Promise<Qr | null> {
    return this.mongoRepository.update(id, data, tracking);
  }

  async activateMany(
    qrCodes: string[],
    expiration: Date,
    tracking: TrackingContext,
  ): Promise<{ matchedCount: number; modifiedCount: number }> {
    return this.mongoRepository.activateMany(qrCodes, expiration, tracking);
  }

  async deactivate(
    id: string,
    reason: string,
    actorId: string,
    tracking: TrackingContext,
  ): Promise<Qr | null> {
    return this.mongoRepository.deactivate(id, reason, actorId, tracking);
  }

  async delete(id: string, tracking: TrackingContext): Promise<boolean> {
    return this.mongoRepository.delete(id, tracking);
  }

  async findPaginatedByUser(
    userId: string,
    page: number,
    limit: number,
    search: string,
    tracking: TrackingContext,
  ): Promise<{ data: Qr[]; pagination: QrPagination }> {
    return this.mongoRepository.findPaginatedByUser(userId, page, limit, search, tracking);
  }

  async findUserByFavorites(
    userId: string,
    page: number,
    limit: number,
    search: string,
    role: string,
    userId2: string,
    tracking: TrackingContext,
  ): Promise<{ data: unknown[]; pagination: QrPagination }> {
    return this.mongoRepository.findUserByFavorites(
      userId,
      page,
      limit,
      search,
      role,
      userId2,
      tracking,
    );
  }
}
