import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ScanDocument = HydratedDocument<ScanSchema>;

@Schema({ timestamps: true, collection: 'scans' })
export class ScanSchema {
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

  @Prop({ required: true })
  userId: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const ScanSchemaDefinition = SchemaFactory.createForClass(ScanSchema);

// Agregando Ã­ndices
ScanSchemaDefinition.index({ idQr: 1 });
ScanSchemaDefinition.index({ scanDate: 1 });
ScanSchemaDefinition.index({ userId: 1 });
ScanSchemaDefinition.index({ userIdScan: 1 });
ScanSchemaDefinition.index({ successful: 1 });

// Ãndice compuesto para bÃºsquedas frecuentes
ScanSchemaDefinition.index({ userId: 1, scanDate: -1 });
ScanSchemaDefinition.index({ idQr: 1, scanDate: -1 });

// Ãndice geoespacial para bÃºsquedas por ubicaciÃ³n
ScanSchemaDefinition.index({ 'location.latitude': 1, 'location.longitude': 1 });

// Ãndice para bÃºsquedas por dispositivo
ScanSchemaDefinition.index({ 'device.platform': 1 });
ScanSchemaDefinition.index({ 'device.browser': 1 });

// Ãndices para fechas
ScanSchemaDefinition.index({ createdAt: 1 });
ScanSchemaDefinition.index({ updatedAt: 1 });

ScanSchemaDefinition.pre('save', function(next) {
  if (!this.scanDate) {
    this.scanDate = new Date();
  }
  next();
});

ScanSchemaDefinition.index({ idQr: 1, scanDate: -1 });
ScanSchemaDefinition.index({ 'location.country': 1 });
ScanSchemaDefinition.index({ 'device.platform': 1 });
