import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Plan } from 'src/plan/entities/plan.entity';
import { Qr } from 'src/qr/entities/qr.entity';
import { User } from 'src/users/interfaces/usuario.type';

export enum DocumentType {
  BOLETA = 'BOLETA',
  FACTURA = 'FACTURA',
  NO_APLICA ='N/A'
}

export interface InvoiceData {
  rut: string;
  direccion: string;
  giro: string;
  razonSocial: string;
}

export enum MethodActivation {
  WEBPAY = 'WEBPAY',
  TRANSFER = 'TRANSFER',
  ADMIN = 'ADMIN'
}

interface TransferDate {
  tranferAmount: number;
  originAccount : string;
  destinationAccount: string;
  originBank: string;
  destinationBank: string;
  transationDate: Date;
}

export enum ActivationSate {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  ADMIN = 'ADMINCREATED',
  PAYED = 'PAYED',
  FAILED = 'FAILED'
}

export enum WebpayState {
  INITIAL = 'INITIAL',
  PENDING = 'PENDING',
  ACTIVE = 'AUTHORIZED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  ERROR = 'ERROR',
  FAILED = 'FAILED'
}

interface WebpayData {
  id?: string;
  date?: Date;
  state?: WebpayState;
}

interface PriceData {
  TotalPrice: number;
  TotalDiscount?: number;
  TotalTax: number;
}

export class QRElement {
  @Prop({ type: Types.ObjectId, ref: 'Qr', required: true })
  qrCode: Qr;

  @Prop({
    type: Number,
    required: true,
    validate: {
      validator: (value: number) => {
        return value > 0;
      },
      message: 'El precio debe ser mayor que 0'
    }
  })
  price: number;

  @Prop({ required: true })
  expirationDate: Date;

  @Prop({ type: String, required: true })
  duration: string;

  @Prop({ type: Types.ObjectId, required: true })
  plan : Plan;
}

@Schema({ timestamps: true })
export class QrActivate {
  @Prop({ required: true, enum: MethodActivation })
  methodActivation: MethodActivation;

  @Prop({ required: false })
  activationDate?: Date;

  @Prop({ required: true ,default: ActivationSate.PENDING})
  state: ActivationSate;

  @Prop({
    required: function() {
      return this.methodActivation === MethodActivation.TRANSFER;
    },
    type: Object
  })
  TransferDate?: TransferDate;

  @Prop({
    required: function() {
      return this.methodActivation === MethodActivation.ADMIN;
    }
  })
  descriptionAdministrator?: string;

  @Prop({
    required: function() {
      return this.methodActivation === MethodActivation.ADMIN;
    }
  })
  adminId?: string;

  @Prop({
    required: function() {
      return this.methodActivation === MethodActivation.WEBPAY;
    },
    type: Object
  })
  WebpayTransaction?: WebpayData;

  @Prop({
    required: function() {
      return this.methodActivation !== MethodActivation.ADMIN;
    },
    type: Object,
    validate: [
      {
        validator: function(value: PriceData) {
          return value.TotalPrice > 0 &&
                 value?.TotalDiscount >= 0 &&
                 value.TotalTax >= 0;
        },
        message: 'Los valores de price deben ser positivos'
      },
      {
        validator: function(this: QrActivate, value: PriceData) {
          if (!this.qrList || this.qrList.length === 0) return false;
          
          const sumQrPrices = this.qrList.reduce((sum, qr) => sum + qr.price, 0);
         
          return Math.abs(sumQrPrices - value.TotalPrice) < 0.01; // Considerando decimales
        },
        message: 'El TotalPrice debe ser igual a la suma de los precios de los QRs'
      }
    ]
  })
  price: PriceData;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop()
  description?: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'QR' }] })
  qrList: QRElement[];

  @Prop({ required: true, enum: DocumentType, default: DocumentType.BOLETA })
  documentType: DocumentType;

  @Prop({
    required: function() {
      return this.documentType === DocumentType.FACTURA;
    },
    type: Object,
    validate: [
      {
        validator: function(value: InvoiceData) {
          if (this.documentType !== DocumentType.FACTURA) return true;
          return value && value.rut && value.direccion && value.giro && value.razonSocial;
        },
        message: 'Todos los campos de facturaciÃ³n son requeridos cuando el tipo de documento es FACTURA'
      }
    ]
  })
  invoiceData?: InvoiceData;

  @Prop({ type: Boolean, default: false })
  sendDocument?: boolean;

  @Prop()
  updatedAt: Date;

  @Prop()
  createdAt: Date;
}

export type QrActivateDocument = QrActivate & Document;
export const QrActivateSchema = SchemaFactory.createForClass(QrActivate);

// Agregando Ã­ndices
QrActivateSchema.index({ userId: 1 });
QrActivateSchema.index({ methodActivation: 1 });
QrActivateSchema.index({ state: 1 });
QrActivateSchema.index({ 'qrList.qrCode': 1 });

// Ãndices compuestos
QrActivateSchema.index({ userId: 1, state: 1 });
QrActivateSchema.index({ userId: 1, methodActivation: 1 });

// Ãndices para fechas
QrActivateSchema.index({ createdAt: 1 });
QrActivateSchema.index({ updatedAt: 1 });

QrActivateSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  this.createdAt = this.createdAt || new Date();
  next();
});