import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { QrType } from 'src/modules/qr/application/dto/create-qr.dto';
import { DurationType } from '../../../../domain/entities/plan.entity';

export type PlanDocument = HydratedDocument<PlanSchema>;

interface Detail {
  detail: string;
}

interface DetailDuration {
  type: DurationType;
  duration: number;
}

@Schema({ timestamps: true })
export class PlanSchema {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  status: string;

  @Prop({ required: false })
  endDate: Date;

  @Prop()
  updatedDate: Date;

  @Prop()
  createdDate: Date;

  @Prop({ type: [{ detail: String }] })
  details: Detail[];

  @Prop({ required: true })
  price: number;

  @Prop({ default: true })
  active: boolean;

  @Prop({ default: false })
  populier: boolean;

  @Prop({ default: false })
  free: boolean;

  @Prop({
    description: 'Indica el tiempo de duraciÃ³n del plan',
    type: Object,
    required: true,
    validate: {
      validator: function (value: DetailDuration) {
        return value.duration > 0 && Object.values(DurationType).includes(value.type);
      },
      message: 'Tipo de duraciÃ³n invÃ¡lido o duraciÃ³n debe ser mayor a 0',
    },
  })
  detailDuration: DetailDuration;

  @Prop({ required: true, type: String, enum: QrType })
  typeQr: string;
}

export const PlanSchemaDefinition = SchemaFactory.createForClass(PlanSchema);

// Agregando Ã­ndices
PlanSchemaDefinition.index({ name: 1 });
PlanSchemaDefinition.index({ status: 1 });
PlanSchemaDefinition.index({ active: 1 });
PlanSchemaDefinition.index({ price: 1 });
PlanSchemaDefinition.index({ free: 1 });
PlanSchemaDefinition.index({ populier: 1 });
PlanSchemaDefinition.index({ endDate: 1 });
PlanSchemaDefinition.index({ createdAt: 1 });
PlanSchemaDefinition.index({ updatedAt: 1 });

PlanSchemaDefinition.pre('save', function (next) {
  this.updatedDate = new Date();
  this.createdDate = this.createdDate || new Date();
  this.active = this.active ?? true;
  this.populier = this.populier ?? false;
  next();
});
