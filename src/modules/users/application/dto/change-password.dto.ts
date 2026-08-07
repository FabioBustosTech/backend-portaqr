import { IsString, MinLength, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(20, { message: 'La nueva contraseña no puede tener más de 20 caracteres.' })
  newPassword: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña anterior debe tener al menos 8 caracteres.' })
  @MaxLength(20, { message: 'La contraseña anterior no puede tener más de 20 caracteres.' })
  currentPassword: string;
}
