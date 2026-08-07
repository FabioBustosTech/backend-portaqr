import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsString({ message: 'El usuario debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El usuario es requerido.' })
  username: string; // Puede ser email o nombre de usuario

  @IsString({ message: 'La contraseña debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'La contraseña es requerida.' })
  password: string;
}