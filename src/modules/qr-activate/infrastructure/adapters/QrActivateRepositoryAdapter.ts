import { Injectable } from '@nestjs/common';
import type { QrActivate } from '../../domain/entities/qr-activate.entity';
import type { ICanCreateQrActivate, ICanGetQrActivate, ICanUpdateQrActivate, ICanDeleteQrActivate } from '../../domain/ports/queries/qr-activate.port';
import type { PaginatedResult } from '../../../../common/dto/pagination.dto';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { MongoQrActivateRepository } from '../repository/mongo/mongo-qr-activate.repository';

@Injectable()
export class QrActivateRepositoryAdapter
  implements
    ICanCreateQrActivate,
    ICanGetQrActivate,
    ICanUpdateQrActivate,
    ICanDeleteQrActivate
{
  constructor(private readonly mongoRepository: MongoQrActivateRepository) {}

  async create(activation: QrActivate, tracking: TrackingContext): Promise<QrActivate> {
    return this.mongoRepository.create(activation, tracking);
  }

  async getAll(
    page: number,
    limit: number,
    search: string | undefined,
    methodActivation: string | undefined,
    userId: string | undefined,
    tracking: TrackingContext,
  ): Promise<PaginatedResult<QrActivate>> {
    return this.mongoRepository.getAll(page, limit, search, methodActivation, userId, tracking);
  }

  async getById(id: string, tracking: TrackingContext): Promise<QrActivate | null> {
    return this.mongoRepository.getById(id, tracking);
  }

  async getByWebpayToken(token: string, tracking: TrackingContext): Promise<QrActivate | null> {
    return this.mongoRepository.getByWebpayToken(token, tracking);
  }

  async update(
    id: string,
    data: Partial<QrActivate>,
    tracking: TrackingContext,
  ): Promise<QrActivate | null> {
    return this.mongoRepository.update(id, data, tracking);
  }

  async delete(id: string, tracking: TrackingContext): Promise<boolean> {
    return this.mongoRepository.delete(id, tracking);
  }
}
