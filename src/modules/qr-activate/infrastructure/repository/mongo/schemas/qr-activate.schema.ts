import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  DocumentType,
  MethodActivation,
  ActivationState,
  WebpayState,
} from '../../../../domain/entities/qr-activate.entity';

export type QrActivateDocument = HydratedDocument<QrActivateSchema>;

@Schema({ timestamps: true, collection: 'qractivates' })
export class QrActivateSchema {
  @Prop({ required: true, enum: MethodActivation })
  methodActivation: MethodActivation;

  @Prop()
  activationDate?: Date;

  @Prop({ required: true, default: ActivationState.PENDING })
  state: ActivationState;

  @Prop({ type: Object })
  TransferDate?: {
    tranferAmount: number;
    originAccount: string;
    destinationAccount: string;
    originBank: string;
    destinationBank: string;
    transationDate: Date;
  };

  @Prop()
  descriptionAdministrator?: string;

  @Prop()
  adminId?: string;

  @Prop({ type: Object })
  WebpayTransaction?: {
    id?: string;
    date?: Date;
    state?: WebpayState;
  };

  @Prop({
    type: Object,
    required: true,
    validate: {
      validator: (value: any) =>
        value && value.TotalPrice > 0 && value.TotalTax >= 0,
      message: 'Los valores de price deben ser positivos',
    },
  })
  price: { TotalPrice: number; TotalDiscount?: number; TotalTax: number };

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: any;

  @Prop()
  description?: string;

  @Prop({
    type: [
      {
        qrCode: { type: Types.ObjectId, ref: 'QR' },
        price: Number,
        expirationDate: Date,
        duration: String,
        plan: { type: Types.ObjectId, ref: 'Plan' },
      },
    ],
  })
  qrList: Array<{
    qrCode: any;
    price: number;
    expirationDate: Date;
    duration: string;
    plan?: any;
  }>;

  @Prop({ required: true, enum: DocumentType, default: DocumentType.BOLETA })
  documentType: DocumentType;

  @Prop({ type: Object })
  invoiceData?: {
    rut: string;
    direccion: string;
    giro: string;
    razonSocial: string;
  };

  @Prop({ default: false })
  sendDocument?: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const QrActivateSchemaDefinition = SchemaFactory.createForClass(QrActivateSchema);

// Ãndices
QrActivateSchemaDefinition.index({ userId: 1 });
QrActivateSchemaDefinition.index({ methodActivation: 1 });
QrActivateSchemaDefinition.index({ state: 1 });
QrActivateSchemaDefinition.index({ 'qrList.qrCode': 1 });
QrActivateSchemaDefinition.index({ userId: 1, state: 1 });
QrActivateSchemaDefinition.index({ userId: 1, methodActivation: 1 });
QrActivateSchemaDefinition.index({ createdAt: 1 });
QrActivateSchemaDefinition.index({ updatedAt: 1 });
