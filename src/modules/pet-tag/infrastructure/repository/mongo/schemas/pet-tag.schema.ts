import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: false, collection: 'pettags' })
export class PetDataSchema {
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

export const PetDataSchemaDefinition = SchemaFactory.createForClass(PetDataSchema);

// Agregando Ã­ndices para PetDataSchema
PetDataSchemaDefinition.index({ petName: 1 });
PetDataSchemaDefinition.index({ ownerName: 1 });
PetDataSchemaDefinition.index({ breed: 1 });
PetDataSchemaDefinition.index({ species: 1 });
PetDataSchemaDefinition.index({ 'vaccines.date': 1 });

export type PetTagDocument = HydratedDocument<PetTagSchema>;

@Schema({ timestamps: true })
export class PetTagSchema {
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

  @Prop({ type: PetDataSchemaDefinition, default: null })
  petData: PetDataSchema | null;

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

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const PetTagSchemaDefinition = SchemaFactory.createForClass(PetTagSchema);

PetTagSchemaDefinition.index({ idQr: 1 });
PetTagSchemaDefinition.index({ userId: 1 });
PetTagSchemaDefinition.index({ status: 1 });
PetTagSchemaDefinition.index({ activationPin: 1 });
PetTagSchemaDefinition.index({ expiration: 1 });
PetTagSchemaDefinition.index({ 'petData.petName': 1 });
