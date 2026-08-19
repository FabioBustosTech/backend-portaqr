import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(20, { message: 'La nueva contraseña no puede tener más de 20 caracteres.' })
  newPassword: string;

  // SPEC-020: opcional — las cuentas Google sin contraseña asignada (hasPassword
  // false, ADR-020.7) no tienen contraseña anterior que verificar (primer set-password).
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La contraseña anterior debe tener al menos 8 caracteres.' })
  @MaxLength(20, { message: 'La contraseña anterior no puede tener más de 20 caracteres.' })
  currentPassword?: string;
}
