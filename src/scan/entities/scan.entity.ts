import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Scan extends Document {
  @Prop({ required: true })
  idQr: string;

  @Prop({ required: true, default: Date.now })
  scanDate: Date;

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
    latitude: number;
    longitude: number;
    accuracy?: number;
    country?: string;
    city?: string;
  };

  @Prop({ required: false, default: 'desconocido' })
  origen?: string;

  @Prop({
    type: {
      platform: { type: String },
      browser: { type: String },
      isMobile: { type: Boolean },
    },
  })
  device?: {
    platform: string;
    browser: string;
    isMobile: boolean;
  };

  @Prop({ default: true })
  successful: boolean;

  @Prop({ default: null })
  errorMessage?: string;

  @Prop()
  userIdScan?: string;


  @Prop()
  lastScanId?: string;

  @Prop({ required: true})
  userId: string;

}

export const ScanSchema = SchemaFactory.createForClass(Scan);

// Agregando índices
ScanSchema.index({ idQr: 1 });
ScanSchema.index({ scanDate: 1 });
ScanSchema.index({ userId: 1 });
ScanSchema.index({ userIdScan: 1 });
ScanSchema.index({ successful: 1 });

// Índice compuesto para búsquedas frecuentes
ScanSchema.index({ userId: 1, scanDate: -1 });
ScanSchema.index({ idQr: 1, scanDate: -1 });

// Índice geoespacial para búsquedas por ubicación
ScanSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

// Índice para búsquedas por dispositivo
ScanSchema.index({ 'device.platform': 1 });
ScanSchema.index({ 'device.browser': 1 });

// Índices para fechas
ScanSchema.index({ createdAt: 1 });
ScanSchema.index({ updatedAt: 1 });

ScanSchema.pre('save', function(next) {
  if (!this.scanDate) {
    this.scanDate = new Date();
  }
  next();
});

ScanSchema.index({ idQr: 1, scanDate: -1 });
ScanSchema.index({ 'location.country': 1 });
ScanSchema.index({ 'device.platform': 1 });
