import type { Scan } from '../../../../domain/entities/scan.entity';
import type { ScanSchema } from '../schemas/scan.schema';

export class ScanMongoMapper {
  static toEntity(doc: ScanSchema & { _id?: unknown }): Scan {
    return {
      id: doc._id?.toString() || '',
      idQr: doc.idQr,
      scanDate: doc.scanDate,
      location: doc.location,
      origen: doc.origen,
      device: doc.device,
      successful: doc.successful,
      errorMessage: doc.errorMessage,
      userIdScan: doc.userIdScan,
      lastScanId: doc.lastScanId,
      userId: doc.userId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  static toSchemaData(scan: Partial<Scan>): Partial<ScanSchema> {
    return {
      idQr: scan.idQr,
      scanDate: scan.scanDate,
      location: scan.location,
      origen: scan.origen,
      device: scan.device,
      successful: scan.successful,
      errorMessage: scan.errorMessage,
      userIdScan: scan.userIdScan,
      lastScanId: scan.lastScanId,
      userId: scan.userId,
    };
  }
}
