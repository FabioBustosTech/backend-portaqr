import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type UserDocument = HydratedDocument<UserSchema>;

@Schema({ timestamps: true, collection: 'users' })
export class UserSchema {
  @ApiProperty({
    description: 'Correo electrónico del usuario',
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
    description: 'Contraseña del usuario',
    example: 'Contraseña123!',
  })
  @Prop({ required: true })
  password: string;

  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Juan',
  })
  // SPEC-020 RF-4: opcional — se captura en el onboarding post-primer-login
  @Prop({ required: false, default: '', trim: true })
  firstName: string;

  @ApiProperty({
    description: 'Apellido paterno del usuario',
    example: 'Pérez',
  })
  // SPEC-020 RF-4: opcional — se captura en el onboarding post-primer-login
  @Prop({ required: false, default: '', trim: true })
  paternalLastName: string;

  @ApiProperty({
    description: 'Apellido materno del usuario',
    example: 'García',
  })
  // SPEC-020 RF-4: opcional — se captura en el onboarding post-primer-login
  @Prop({ required: false, default: '', trim: true })
  maternalLastName: string;

  @ApiProperty({
    description: 'Rol del usuario',
    example: 'user',
    default: 'user',
  })
  @Prop({ default: 'user', enum: ['user', 'admin'] })
  role: string;

  @ApiProperty({
    description: 'Estado de verificación del email',
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
    description: 'Teléfono del usuario',
    example: '+1234567890',
    required: false,
  })
  @Prop()
  phone?: string;

  @ApiProperty({
    description: 'Fecha de último inicio de sesión',
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

  // SPEC-020 RF-27: flag de correo de bienvenida enviado (primer login con cuenta verificada)
  @Prop({ default: false })
  welcomeEmailSent: boolean;

  // SPEC-020 RF-9: campos Google OAuth
  @Prop({ unique: true, sparse: true })
  googleId?: string;

  @Prop({ default: 'local', enum: ['local', 'google'] })
  provider: string;

  // SPEC-020: false solo para cuentas Google que aún no asignan contraseña
  // (ADR-020.7: nacen con hash aleatorio inutilizable). true para locales y
  // para Google que ya la asignaron (primer set-password).
  @Prop({ default: true })
  hasPassword: boolean;

  @Prop()
  avatarUrl?: string;

  // SPEC-030 RF-8: copia local del intent de newsletter (auditoría/reintento).
  // La fuente de verdad vive en qr-cms (colección subscribers).
  @Prop({ default: false })
  newsletterOptIn?: boolean;

  @Prop()
  newsletterSyncedAt?: Date;
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
