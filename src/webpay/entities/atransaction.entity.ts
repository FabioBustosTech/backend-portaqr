import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TransactionDocument = Transaction & Document;

@Schema()
export class Transaction {
  @Prop({ required: true })
  token: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  buyOrder: string;

  @Prop({ required: true })
  sessionId: string;

  @Prop({ required: true })
  status: string;

  @Prop()
  transactionDate: Date;

  @Prop()
  paymentTypeCode: string;

  @Prop()
  authorizationCode: string;

  @Prop()
  responseCode: number;

  @Prop()
  vci: string;

  @Prop()
  cardNumber: string;

  @Prop()
  accountingDate: string;

  @Prop()
  installmentsNumber: number;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

// Agregando índices
// Índices individuales
TransactionSchema.index({ token: 1 });
TransactionSchema.index({ sessionId: 1 });
TransactionSchema.index({ buyOrder: 1 });
TransactionSchema.index({ status: 1 });

// Índice compuesto para búsquedas frecuentes
TransactionSchema.index({ sessionId: 1, status: 1 });
TransactionSchema.index({ buyOrder: 1, status: 1 });

// Índice para fechas
TransactionSchema.index({ transactionDate: 1 });
TransactionSchema.index({ createdAt: 1 });
TransactionSchema.index({ updatedAt: 1 }); 