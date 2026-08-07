import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema({ 
  timestamps: true
})
export class User extends Document {
  @ApiProperty({
    description: 'Correo electrónico del usuario',
    example: 'usuario@ejemplo.com'
  })
  @Prop({ required: true, unique: true, trim: true })
  email: string;

  @ApiProperty({
    description: 'Nombre de usuario',
    example: 'usuario123'
  })
  @Prop({ required: true, unique: true, trim: true })
  userName: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'Contraseña123!'
  })
  @Prop({ required: true })
  password: string;

  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Juan'
  })
  @Prop({ required: true, trim: true })
  firstName: string;

  @ApiProperty({
    description: 'Apellido paterno del usuario',
    example: 'Pérez'
  })
  @Prop({ required: true, trim: true })
  paternalLastName: string;

  @ApiProperty({
    description: 'Apellido materno del usuario',
    example: 'García'
  })
  @Prop({ required: true, trim: true })
  maternalLastName: string;

  @ApiProperty({
    description: 'Rol del usuario',
    example: 'user',
    default: 'user'
  })
  @Prop({ default: 'user', enum: ['user', 'admin'] })
  role: string;

  @ApiProperty({
    description: 'Estado de verificación del email',
    example: false,
    default: false
  })
  @Prop({ default: false })
  isEmailVerified: boolean;

  @ApiProperty({
    description: 'Teléfono del usuario',
    example: '+1234567890',
    required: false
  })
  @Prop()
  phone?: string;

  @ApiProperty({
    description: 'Fecha de último inicio de sesión',
    required: false
  })
  @Prop()
  lastLogin?: Date;

  @ApiProperty({
    description: 'Fecha de creación del registro',
    required: false
  })
  @Prop()
  createdAt?: Date;

  @ApiProperty({
    description: 'Fecha de última actualización del registro',
    required: false
  })
  @Prop()
  updatedAt?: Date;

  @Prop()
  verificationCode: string;

  @Prop()
  verificationCodeExpires?: Date;

  @Prop()
  passwordResetCode?: string;

  @Prop()
  passwordResetExpires?: Date;
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);

// Add indices
UserSchema.index({ email: 1 }, { name: 'email_index' });
UserSchema.index({ userName: 1 }, { name: 'username_index' });
UserSchema.index({ role: 1 }, { name: 'role_index' });
UserSchema.index({ isEmailVerified: 1 }, { name: 'verification_index' });
UserSchema.index({ createdAt: -1 }, { name: 'created_at_index' });
UserSchema.index({ updatedAt: -1 }, { name: 'updated_at_index' });
UserSchema.index({ firstName: 1, paternalLastName: 1, maternalLastName: 1 }, { name: 'name_index', sparse: true });