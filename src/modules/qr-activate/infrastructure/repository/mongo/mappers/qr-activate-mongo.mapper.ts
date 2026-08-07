import type { QrActivate } from '../../../../domain/entities/qr-activate.entity';
import type { QrActivateSchema } from '../schemas/qr-activate.schema';

export class QrActivateMongoMapper {
  static toEntity(doc: QrActivateSchema & { _id?: unknown }): QrActivate {
    return {
      id: doc._id?.toString() || '',
      methodActivation: doc.methodActivation,
      activationDate: doc.activationDate,
      state: doc.state,
      TransferDate: doc.TransferDate,
      descriptionAdministrator: doc.descriptionAdministrator,
      adminId: doc.adminId,
      WebpayTransaction: doc.WebpayTransaction,
      price: doc.price,
      userId: doc.userId?.toString?.() || String(doc.userId),
      description: doc.description,
      qrList: (doc.qrList || []).map((qr) => ({
        qrCode: qr.qrCode?.toString?.() || String(qr.qrCode),
        price: qr.price,
        expirationDate: qr.expirationDate,
        duration: qr.duration,
        plan: qr.plan?.toString?.() || (qr.plan ? String(qr.plan) : undefined),
      })),
      documentType: doc.documentType,
      invoiceData: doc.invoiceData,
      sendDocument: doc.sendDocument,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  static toSchemaData(activation: Partial<QrActivate>): Partial<QrActivateSchema> {
    return {
      methodActivation: activation.methodActivation,
      activationDate: activation.activationDate,
      state: activation.state,
      TransferDate: activation.TransferDate,
      descriptionAdministrator: activation.descriptionAdministrator,
      adminId: activation.adminId,
      WebpayTransaction: activation.WebpayTransaction,
      price: activation.price,
      userId: activation.userId as any,
      description: activation.description,
      qrList: activation.qrList?.map((qr) => ({
        qrCode: qr.qrCode as any,
        price: qr.price,
        expirationDate: qr.expirationDate,
        duration: qr.duration,
        plan: qr.plan as any,
      })),
      documentType: activation.documentType,
      invoiceData: activation.invoiceData,
      sendDocument: activation.sendDocument,
    };
  }
}
