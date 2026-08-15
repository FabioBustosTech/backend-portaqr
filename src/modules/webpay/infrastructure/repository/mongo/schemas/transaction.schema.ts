import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TransactionDocument = HydratedDocument<TransactionSchema>;

@Schema({ collection: 'transactions' })
export class TransactionSchema {
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
  transactionDate?: Date;

  @Prop()
  paymentTypeCode?: string;

  @Prop()
  authorizationCode?: string;

  @Prop()
  responseCode?: number;

  @Prop()
  vci?: string;

  @Prop()
  cardNumber?: string;

  @Prop()
  accountingDate?: string;

  @Prop()
  installmentsNumber?: number;
}

export const TransactionSchemaDefinition = SchemaFactory.createForClass(TransactionSchema);

// Índices
TransactionSchemaDefinition.index({ token: 1 });
TransactionSchemaDefinition.index({ sessionId: 1 });
TransactionSchemaDefinition.index({ buyOrder: 1 });
TransactionSchemaDefinition.index({ status: 1 });
TransactionSchemaDefinition.index({ sessionId: 1, status: 1 });
TransactionSchemaDefinition.index({ buyOrder: 1, status: 1 });
