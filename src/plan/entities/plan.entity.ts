import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { QrType } from 'src/qr/dto/create-qr.dto';

interface Detail {
  detail: string;
}

export enum DurationType {
  DAYS = 'DAYS',
  WEEKS = 'WEEKS',
  MONTHS = 'MONTHS',
  YEARS = 'YEARS'
}

interface DetailDuration {
  type: DurationType;
  duration: number;
}

@Schema({ timestamps: true })
export class Plan extends Document {
  @ApiProperty({
    description: 'Nombre del plan',
    example: 'Plan Premium'
  })
  @Prop({ required: true, trim: true })
  name: string;
  
  @ApiProperty({
    description: 'Descripción del plan',
    example: 'Plan con características premium'
  })
  @Prop({ required: true })
  description: string;
  
  @ApiProperty({
    description: 'Estado del plan',
    example: 'active'
  })
  @Prop({ required: true })
  status: string;

  @ApiProperty({
    description: 'Fecha de finalización',
    example: '2024-12-31'
  })
  @Prop({ required: false })
  endDate: Date;

  @ApiProperty({
    description: 'Fecha de última actualización'
  })
  @Prop()
  updatedDate: Date;

  @ApiProperty({
    description: 'Fecha de creación'
  })
  @Prop()
  createdDate: Date;

  @ApiProperty({
    description: 'Detalles del plan',
    example: [{ detail: 'Acceso ilimitado' }]
  })
  @Prop({ type: [{ detail: String }] })
  details: Detail[];

  @ApiProperty({
    description: 'Precio del plan',
    example: 99.99
  })
  @Prop({ required: true })
  price: number;

  @ApiProperty({
    description: 'Estado de activación del plan',
    default: true
  })
  @Prop({ default: true })
  active: boolean;

  @ApiProperty({
    description: 'Indica si el plan es popular',
    default: false
  })
  @Prop({ default: false })
  populier: boolean;

  @ApiProperty({
    description: 'Indica si el plan es gratuito',
    default: false
  })
  @Prop({ default: false })
  free: boolean;

  @Prop({
    description: 'Indica el tiempo de duración del plan',
    type: Object,
    required: true,
    validate: {
      validator: function(value: DetailDuration) {
        return value.duration > 0 && 
               Object.values(DurationType).includes(value.type);
      },
      message: 'Tipo de duración inválido o duración debe ser mayor a 0'
    }
  })
  detailDuration: DetailDuration;

  @ApiProperty({
    description: 'Tipo de QR',
    example: 'dynamic'
  })
  @Prop({ required: true, type: String, enum: QrType})
  typeQr: string;

}

export type PlanDocument = Plan & Document;
export const PlanSchema = SchemaFactory.createForClass(Plan);

// Agregando índices
PlanSchema.index({ name: 1 });
PlanSchema.index({ status: 1 });
PlanSchema.index({ active: 1 });
PlanSchema.index({ price: 1 });
PlanSchema.index({ free: 1 });
PlanSchema.index({ populier: 1 });
PlanSchema.index({ endDate: 1 });
PlanSchema.index({ createdAt: 1 });
PlanSchema.index({ updatedAt: 1 });

PlanSchema.pre('save', function(next) {
  this.updatedDate = new Date();
  this.createdDate = this.createdDate || new Date();
  this.active = this.active ?? true;
  this.populier = this.populier ?? false;
  next();
});