import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
// SPEC-008 Capa 1 (R1 XSS): limpieza de HTML en la entrada — el contenido se
// guarda/envía como texto plano sin formato (anti XSS / HTML injection).
import { stripHtml } from 'src/common/utils/strip-html.util';

export class ContactFormDto {
  @ApiProperty({
    description: 'Nombre del remitente',
    example: 'Juan Pérez',
  })
  @Transform(({ value }) => (typeof value === 'string' ? stripHtml(value) : value))
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
  @Transform(({ value }) => (typeof value === 'string' ? stripHtml(value) : value))
  @IsString()
  @IsNotEmpty()
  asunto: string;

  @ApiProperty({
    description: 'Contenido del mensaje',
    example: 'Me gustaría obtener más información sobre...',
  })
  @Transform(({ value }) => (typeof value === 'string' ? stripHtml(value) : value))
  @IsString()
  @IsNotEmpty()
  mensaje: string;
}
