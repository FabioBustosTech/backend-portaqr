import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ContactFormDto {
  @ApiProperty({
    description: 'Nombre del remitente',
    example: 'Juan Pérez',
  })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({
    description: 'Email del remitente',
    example: 'juan@ejemplo.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Asunto del mensaje',
    example: 'Consulta sobre servicios',
  })
  @IsString()
  @IsNotEmpty()
  asunto: string;

  @ApiProperty({
    description: 'Contenido del mensaje',
    example: 'Me gustaría obtener más información sobre...',
  })
  @IsString()
  @IsNotEmpty()
  mensaje: string;
}
