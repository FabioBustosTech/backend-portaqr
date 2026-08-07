import type { Scan } from '../../entities/scan.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';

export interface ICanCreateScan {
  create(scan: Scan, tracking: TrackingContext): Promise<Scan>;
}

export interface ICanGetScan {
  getStatsByQrId(idQr: string, tracking: TrackingContext): Promise<unknown>;
  getDailyStats(idQr: string, days: number, tracking: TrackingContext): Promise<unknown>;
  getDeviceStats(idQr: string, tracking: TrackingContext): Promise<unknown>;
  getOriginStats(idQr: string, tracking: TrackingContext): Promise<unknown>;
  getLocationStats(idQr: string, tracking: TrackingContext): Promise<unknown>;
  getRecentScans(idQr: string, limit: number, tracking: TrackingContext): Promise<Scan[]>;
}
