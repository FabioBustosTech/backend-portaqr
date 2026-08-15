import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type QrFreeGenerationDocument = HydratedDocument<QrFreeGenerationSchema>;

@Schema({ timestamps: true, collection: 'qrfreegenerations' })
export class QrFreeGenerationSchema {
  @Prop({ required: true })
  email: string;

  @Prop({
    type: {
      typeQr: { type: String },
      data: { type: String },
    },
    required: true,
  })
  information: {
    typeQr: string;
    data: string;
  };

  @Prop({
    type: {
      latitude: { type: Number },
      longitude: { type: Number },
      accuracy: { type: Number },
      country: { type: String },
      city: { type: String },
    },
  })
  location?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    country?: string;
    city?: string;
  };

  @Prop({
    type: {
      platform: { type: String },
      browser: { type: String },
      isMobile: { type: Boolean },
    },
  })
  device?: {
    platform?: string;
    browser?: string;
    isMobile?: boolean;
  };

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const QrFreeGenerationSchemaDefinition =
  SchemaFactory.createForClass(QrFreeGenerationSchema);

// Agregando índices
QrFreeGenerationSchemaDefinition.index({ email: 1 });
QrFreeGenerationSchemaDefinition.index({ 'information.typeQr': 1 });

// Índice compuesto para búsquedas frecuentes
QrFreeGenerationSchemaDefinition.index({ email: 1, 'information.typeQr': 1 });

// Índice geoespacial para búsquedas por ubicación
QrFreeGenerationSchemaDefinition.index({ 'location.latitude': 1, 'location.longitude': 1 });

// Índice para búsquedas por dispositivo
QrFreeGenerationSchemaDefinition.index({ 'device.platform': 1 });
QrFreeGenerationSchemaDefinition.index({ 'device.browser': 1 });

// Índice para fecha de creación
QrFreeGenerationSchemaDefinition.index({ createdAt: 1 });
