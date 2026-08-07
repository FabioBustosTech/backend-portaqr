import { Injectable } from '@nestjs/common';
import type { Scan } from '../../domain/entities/scan.entity';
import type { ICanCreateScan, ICanGetScan } from '../../domain/ports/queries/scan.port';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { MongoScanRepository } from '../repository/mongo/mongo-scan.repository';

@Injectable()
export class ScanRepositoryAdapter implements ICanCreateScan, ICanGetScan {
  constructor(private readonly mongoRepository: MongoScanRepository) {}

  async create(scan: Scan, tracking: TrackingContext): Promise<Scan> {
    return this.mongoRepository.create(scan, tracking);
  }

  async getStatsByQrId(idQr: string, tracking: TrackingContext): Promise<unknown> {
    return this.mongoRepository.getStatsByQrId(idQr, tracking);
  }

  async getDailyStats(
    idQr: string,
    days: number,
    tracking: TrackingContext,
  ): Promise<unknown> {
    return this.mongoRepository.getDailyStats(idQr, days, tracking);
  }

  async getDeviceStats(idQr: string, tracking: TrackingContext): Promise<unknown> {
    return this.mongoRepository.getDeviceStats(idQr, tracking);
  }

  async getOriginStats(idQr: string, tracking: TrackingContext): Promise<unknown> {
    return this.mongoRepository.getOriginStats(idQr, tracking);
  }

  async getLocationStats(idQr: string, tracking: TrackingContext): Promise<unknown> {
    return this.mongoRepository.getLocationStats(idQr, tracking);
  }

  async getRecentScans(
    idQr: string,
    limit: number,
    tracking: TrackingContext,
  ): Promise<Scan[]> {
    return this.mongoRepository.getRecentScans(idQr, limit, tracking);
  }
}
