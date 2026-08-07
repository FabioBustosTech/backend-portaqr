import { Prop, Schema ,SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CommercialStatus } from '../enums/commercial-status.enum';

@Schema({ timestamps: false })
export class PetDataEntity {
  @Prop({ type: String, required: true })
  ownerName: string;

  @Prop({ type: String, required: true })
  address: string;

  @Prop({ type: String, required: true })
  phone: string;

  @Prop({ type: String, required: true })
  petName: string;

  @Prop({ type: String, required: false })
  birthDate?: string;

  @Prop({ type: String, required: false })
  breed?: string;

  @Prop({ type: String, required: false })
  gender?: string;

  @Prop({ type: String, required: false })
  species?: string;

  @Prop({ type: String, required: false })
  dietFrequency?: string;

  @Prop({ type: String, required: false })
  diseases?: string;

  @Prop({ type: [{
    name: String,
    date: String
  }], required: false })
  vaccines?: Array<{
    name?: string;
    date?: string;
  }>;

  @Prop({ type: String, required: false })
    observations?: string;
}

export const PetDataSchema = SchemaFactory.createForClass(PetDataEntity);

// Agregando índices para PetDataEntity
PetDataSchema.index({ petName: 1 });
PetDataSchema.index({ ownerName: 1 });
PetDataSchema.index({ breed: 1 });
PetDataSchema.index({ species: 1 });
PetDataSchema.index({ 'vaccines.date': 1 });

@Schema({ timestamps: true })
export class PetTag extends Document {
  @Prop({ type: String, required: false })
  name?: string;

  @Prop({ type: String, required: true, unique: true, index: true, trim: true })
  idQr: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  userId: Types.ObjectId | null;

  @Prop({ type: String, required: true, unique: true })
  activationPin: string;

  @Prop({ type: String, enum: ['RESERVADO', 'ACTIVO', 'INACTIVO'], default: 'RESERVADO' })
  status: string;

  @Prop({ type: PetDataSchema, default: null })
  petData: PetDataEntity | null;

  @Prop({ type: Date, default: null })
  expiration: Date | null;

  @Prop({ 
    type: String, 
    enum: ['EN_CREACION', 'EN_BODEGA', 'ASIGNADO_COMERCIO', 'VENDIDO'],
    default: 'EN_CREACION' 
  })
  commercialStatus: string;

  @Prop({ type: Boolean, default: false })
  isFavorite: boolean;

  @Prop({ type: String, default: null, index: true })
  assignedStoreName: string | null;
}

export type PetTagDocument = PetTag & Document & {
  createdAt: Date;
  updatedAt: Date;
};
export const PetTagSchema = SchemaFactory.createForClass(PetTag);

PetTagSchema.index({ idQr: 1 });
PetTagSchema.index({ userId: 1 });
PetTagSchema.index({ status: 1 });
PetTagSchema.index({ activationPin: 1 });
PetTagSchema.index({ expiration: 1 });
PetTagSchema.index({ 'petData.petName': 1 });
