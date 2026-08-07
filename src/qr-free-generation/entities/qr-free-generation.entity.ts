import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema({ timestamps: true })
export class QrFreeGeneration {
  @ApiProperty({
    description: 'Email del usuario que generó el QR',
    example: 'usuario@ejemplo.com'
  })
  @Prop({ required: true })
  email: string;

  @ApiProperty({
    description: 'Información del QR generado',
    example: {
      type: 'url',
      data: 'https://ejemplo.com'
    }
  })
  @Prop({
    type: {
      typeQr: {type: String },
      data: {type: String },
    },
    required: true
  })
  information: {
    typeQr: string,
    data: string,
  };

  @ApiProperty({
    description: 'Información de ubicación del escaneo',
    example: {
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 10,
      country: 'España',
      city: 'Madrid'
    }
  })
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

  @ApiProperty({
    description: 'Información del dispositivo que realizó el escaneo',
    example: {
      platform: 'iOS',
      browser: 'Safari',
      isMobile: false
    }
  })
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

  @ApiProperty({
    description: 'Fecha de creación del registro',
    example: '2024-03-19T12:00:00Z'
  })
  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export type QrFreeGenerationDocument = QrFreeGeneration & Document;
export const QrFreeGenerationSchema = SchemaFactory.createForClass(QrFreeGeneration);

// Agregando índices
QrFreeGenerationSchema.index({ email: 1 });
QrFreeGenerationSchema.index({ 'information.typeQr': 1 });

// Índice compuesto para búsquedas frecuentes
QrFreeGenerationSchema.index({ email: 1, 'information.typeQr': 1 });

// Índice geoespacial para búsquedas por ubicación
QrFreeGenerationSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

// Índice para búsquedas por dispositivo
QrFreeGenerationSchema.index({ 'device.platform': 1 });
QrFreeGenerationSchema.index({ 'device.browser': 1 });

// Índice para fecha de creación
QrFreeGenerationSchema.index({ createdAt: 1 });