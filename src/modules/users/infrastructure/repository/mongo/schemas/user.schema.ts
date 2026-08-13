import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type UserDocument = HydratedDocument<UserSchema>;

@Schema({ timestamps: true, collection: 'users' })
export class UserSchema {
  @ApiProperty({
    description: 'Correo electrÃ³nico del usuario',
    example: 'usuario@ejemplo.com',
  })
  @Prop({ required: true, unique: true, trim: true })
  email: string;

  @ApiProperty({
    description: 'Nombre de usuario',
    example: 'usuario123',
  })
  @Prop({ required: true, unique: true, trim: true })
  userName: string;

  @ApiProperty({
    description: 'ContraseÃ±a del usuario',
    example: 'ContraseÃ±a123!',
  })
  @Prop({ required: true })
  password: string;

  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Juan',
  })
  @Prop({ required: true, trim: true })
  firstName: string;

  @ApiProperty({
    description: 'Apellido paterno del usuario',
    example: 'PÃ©rez',
  })
  @Prop({ required: true, trim: true })
  paternalLastName: string;

  @ApiProperty({
    description: 'Apellido materno del usuario',
    example: 'GarcÃ­a',
  })
  @Prop({ required: true, trim: true })
  maternalLastName: string;

  @ApiProperty({
    description: 'Rol del usuario',
    example: 'user',
    default: 'user',
  })
  @Prop({ default: 'user', enum: ['user', 'admin'] })
  role: string;

  @ApiProperty({
    description: 'Estado de verificaciÃ³n del email',
    example: false,
    default: false,
  })
  @Prop({ default: false })
  isEmailVerified: boolean;

  @ApiProperty({
    description: 'Versión del token JWT (invalida tokens al hacer logout)',
    example: 0,
    default: 0,
    required: false,
  })
  @Prop({ type: Number, default: 0 })
  tokenVersion: number;

  @ApiProperty({
    description: 'TelÃ©fono del usuario',
    example: '+1234567890',
    required: false,
  })
  @Prop()
  phone?: string;

  @ApiProperty({
    description: 'Fecha de Ãºltimo inicio de sesiÃ³n',
    required: false,
  })
  @Prop()
  lastLogin?: Date;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;

  @Prop()
  verificationCode?: string;

  @Prop()
  verificationCodeExpires?: Date;

  // SPEC-009 A5: intentos fallidos de verify-email (tras 5 → se invalida el código)
  @Prop({ type: Number, default: 0 })
  verificationAttempts: number;

  @Prop()
  passwordResetCode?: string;

  @Prop()
  passwordResetExpires?: Date;

  // SPEC-009 A5: intentos fallidos de reset-password (tras 5 → se invalida el código)
  @Prop({ type: Number, default: 0 })
  passwordResetAttempts: number;
}

export const UserSchemaDefinition = SchemaFactory.createForClass(UserSchema);

// Add indices
UserSchemaDefinition.index({ email: 1 }, { name: 'email_index' });
UserSchemaDefinition.index({ userName: 1 }, { name: 'username_index' });
UserSchemaDefinition.index({ role: 1 }, { name: 'role_index' });
UserSchemaDefinition.index({ isEmailVerified: 1 }, { name: 'verification_index' });
UserSchemaDefinition.index({ createdAt: -1 }, { name: 'created_at_index' });
UserSchemaDefinition.index({ updatedAt: -1 }, { name: 'updated_at_index' });
UserSchemaDefinition.index(
  { firstName: 1, paternalLastName: 1, maternalLastName: 1 },
  { name: 'name_index', sparse: true },
);
