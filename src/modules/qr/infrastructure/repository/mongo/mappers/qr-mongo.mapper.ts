import type { Qr } from '../../../../domain/entities/qr.entity';
import type { QrSchema } from '../schemas/qr.schema';

export class QrMongoMapper {
  static toEntity(doc: QrSchema & { _id?: unknown }): Qr {
    return {
      id: doc._id?.toString() || '',
      idQr: doc.idQr,
      userId: doc.userId,
      expiration: doc.expiration,
      quantityUpdateMonth: doc.quantityUpdateMonth,
      description: doc.description,
      data: doc.data,
      name: doc.name,
      updatedAt: doc.updatedAt,
      active: doc.active,
      isFavorite: doc.isFavorite,
      isOldMode: doc.isOldMode,
      typeQr: doc.typeQr,
      createdAt: doc.createdAt,
    };
  }

  static toSchemaData(qr: Partial<Qr>): Partial<QrSchema> {
    return {
      idQr: qr.idQr,
      userId: qr.userId,
      expiration: qr.expiration,
      quantityUpdateMonth: qr.quantityUpdateMonth,
      description: qr.description,
      data: qr.data as any,
      name: qr.name,
      active: qr.active,
      isFavorite: qr.isFavorite,
      isOldMode: qr.isOldMode,
      typeQr: qr.typeQr,
    };
  }
}
