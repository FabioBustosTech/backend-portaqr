import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RefreshTokenDocument = HydratedDocument<RefreshTokenSchema>;

@Schema({ timestamps: true, collection: 'refresh_tokens' })
export class RefreshTokenSchema {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: any;

  /** SHA-256 del refresh token JWT — nunca el token plano */
  @Prop({ required: true, unique: true, index: true })
  tokenHash: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  revokedAt?: Date;

  @Prop()
  createdAt?: Date;
}

export const RefreshTokenSchemaDefinition = SchemaFactory.createForClass(RefreshTokenSchema);

// TTL: Mongo borra automáticamente los documentos expirados (SPEC-009 A8)
RefreshTokenSchemaDefinition.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
RefreshTokenSchemaDefinition.index({ userId: 1, revokedAt: 1 }, { name: 'refresh_user_active' });
