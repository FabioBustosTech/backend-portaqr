import { randomUUID } from 'crypto';
import type { Qr } from '../../../../domain/entities/qr.entity';
import type { QrSchema } from '../schemas/qr.schema';

export class QrMongoMapper {
  static toEntity(doc: QrSchema & { _id?: unknown }): Qr {
    // SPEC-005 RF-12: garantizar itemId estable en cada item de urlList (mejor esfuerzo).
    // Los items pre-SPEC-005 no tienen itemId → se genera al vuelo (no se persiste;
    // toSchemaData queda intacto para no forzar una migración masiva).
    const data = doc.data ? { ...doc.data } : doc.data;
    if (data && Array.isArray(data.urlList)) {
      data.urlList = data.urlList.map((item) => ({
        ...item,
        itemId: item.itemId ?? randomUUID(),
      }));
    }
    return {
      id: doc._id?.toString() || '',
      idQr: doc.idQr,
      userId: doc.userId,
      expiration: doc.expiration,
      quantityUpdateMonth: doc.quantityUpdateMonth,
      description: doc.description,
      data,
      name: doc.name,
      updatedAt: doc.updatedAt,
      active: doc.active,
      isFavorite: doc.isFavorite,
      isOldMode: doc.isOldMode,
      typeQr: doc.typeQr,
      createdAt: doc.createdAt,
      // SPEC-014: trazabilidad de desactivación admin
      deactivatedAt: doc.deactivatedAt,
      deactivatedBy: doc.deactivatedBy,
      deactivationReason: doc.deactivationReason,
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
      deactivatedAt: qr.deactivatedAt,
      deactivatedBy: qr.deactivatedBy,
      deactivationReason: qr.deactivationReason,
    };
  }
}
