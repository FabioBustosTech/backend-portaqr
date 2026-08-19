import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, IsBoolean, MaxLength, IsIn } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido.' })
  email: string;

  // SPEC-020 RF-1: userName opcional — el backend genera `user_<8 hex>` si se omite (ADR-020.1)
  @IsString({ message: 'El nombre de usuario debe ser una cadena de texto.' })
  @IsOptional()
  @MinLength(3, { message: 'El nombre de usuario debe tener al menos 3 caracteres.' })
  @MaxLength(20, { message: 'El nombre de usuario no puede tener más de 20 caracteres.' })
  userName?: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'La contraseña es requerida.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(20, { message: 'La contraseña no puede tener más de 20 caracteres.' })
  password: string;

  // SPEC-020 RF-1: nombre/apellidos opcionales — se capturan en el onboarding post-primer-login
  @IsString({ message: 'El nombre debe ser una cadena de texto.' })
  @IsOptional()
  @MaxLength(20, { message: 'El nombre no puede tener más de 20 caracteres.' })
  firstName?: string;

  @IsString({ message: 'El apellido paterno debe ser una cadena de texto.' })
  @IsOptional()
  @MaxLength(20, { message: 'El apellido paterno no puede tener más de 20 caracteres.' })
  paternalLastName?: string;

  @IsString({ message: 'El apellido materno debe ser una cadena de texto.' })
  @IsOptional()
  @MaxLength(20, { message: 'El apellido materno no puede tener más de 20 caracteres.' })
  maternalLastName?: string;

  @IsString({ message: 'El teléfono debe ser una cadena de texto.' })
  @MaxLength(12, { message: 'El teléfono no puede tener más de 12 caracteres.' })
  @IsOptional()
  phone?: string;

  @IsBoolean()
  @IsOptional()
  isEmailVerified?: boolean = false;

  // SPEC-020 RF-9: campos Google OAuth (solo los setea GoogleAuthService)
  @IsString()
  @IsOptional()
  googleId?: string;

  @IsIn(['local', 'google'])
  @IsOptional()
  provider?: 'local' | 'google';

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsOptional()
  lastLogin?: Date;

  @IsOptional()
  createdAt?: Date;

  @IsOptional()
  updatedAt?: Date;
}
