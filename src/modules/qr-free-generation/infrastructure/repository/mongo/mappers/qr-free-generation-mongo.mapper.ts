import type { QrFreeGeneration } from '../../../../domain/entities/qr-free-generation.entity';
import type { QrFreeGenerationSchema } from '../schemas/qr-free-generation.schema';

export class QrFreeGenerationMongoMapper {
  static toEntity(doc: QrFreeGenerationSchema & { _id?: unknown }): QrFreeGeneration {
    return {
      id: doc._id?.toString() || '',
      email: doc.email,
      information: doc.information,
      location: doc.location,
      device: doc.device,
      createdAt: doc.createdAt,
    };
  }

  static toSchemaData(qrFreeGeneration: Partial<QrFreeGeneration>): Partial<QrFreeGenerationSchema> {
    return {
      email: qrFreeGeneration.email,
      information: qrFreeGeneration.information,
      location: qrFreeGeneration.location,
      device: qrFreeGeneration.device,
    };
  }
}
