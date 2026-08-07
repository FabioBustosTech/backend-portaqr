import { Injectable } from '@nestjs/common';
import type { QrFreeGeneration, PaginatedQrFreeGenerations } from '../../domain/entities/qr-free-generation.entity';
import type {
  ICanCreateQrFreeGeneration,
  ICanGetAllQrFreeGeneration,
  ICanGetQrFreeGeneration,
} from '../../domain/ports/queries/qr-free-generation.port';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { MongoQrFreeGenerationRepository } from '../repository/mongo/mongo-qr-free-generation.repository';

@Injectable()
export class QrFreeGenerationRepositoryAdapter
  implements ICanCreateQrFreeGeneration, ICanGetAllQrFreeGeneration, ICanGetQrFreeGeneration
{
  constructor(private readonly mongoRepository: MongoQrFreeGenerationRepository) {}

  async create(
    qrFreeGeneration: QrFreeGeneration,
    tracking: TrackingContext,
  ): Promise<QrFreeGeneration> {
    return this.mongoRepository.create(qrFreeGeneration, tracking);
  }

  async getAll(
    page: number,
    limit: number,
    search: string,
    tracking: TrackingContext,
  ): Promise<PaginatedQrFreeGenerations> {
    return this.mongoRepository.getAll(page, limit, search, tracking);
  }

  async getById(id: string, tracking: TrackingContext): Promise<QrFreeGeneration | null> {
    return this.mongoRepository.getById(id, tracking);
  }
}
