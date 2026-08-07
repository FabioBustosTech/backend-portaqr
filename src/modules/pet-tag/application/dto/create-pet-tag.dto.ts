import { IsArray, IsNotEmpty, IsOptional, IsString, IsBoolean } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class PetData {

  @IsString({ message: 'El nombre del propietario debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre del propietario es requerido' })
  @ApiProperty({
    description: 'Nombre del propietario de la mascota',
    example: 'Juan Pérez'
  })
  ownerName: string;

  @IsString({ message: 'La dirección debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La dirección es requerida' })
  @ApiProperty({
    description: 'Dirección del propietario',
    example: 'Calle 123, Ciudad'
  })
  address: string;

  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El teléfono es requerido' })
  @ApiProperty({
    description: 'Teléfono del propietario',
    example: '+56912345678'
  })
  phone: string;

  @IsString({ message: 'El nombre de la mascota debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre de la mascota es requerido' })
  @ApiProperty({
    description: 'Nombre de la mascota',
    example: 'Fido'
  })
  petName: string;

  @IsString({ message: 'La fecha de nacimiento debe ser una cadena de texto' })
  @IsOptional()
  @ApiProperty({
    description: 'Fecha de nacimiento de la mascota',
    example: '2020-01-01',
    required: false
  })
  birthDate?: string;

  @IsString({ message: 'La raza debe ser una cadena de texto' })
  @IsOptional()
  @ApiProperty({
    description: 'Raza de la mascota',
    example: 'Labrador',
    required: false
  })
  breed?: string;

  @IsString({ message: 'El género debe ser una cadena de texto' })
  @IsOptional()
  @ApiProperty({
    description: 'Género de la mascota',
    example: 'Macho',
    enum: ['Macho', 'Hembra'],
    required: false
  })
  gender?: string;

  @IsString({ message: 'La especie debe ser una cadena de texto' })
  @IsOptional()
  @ApiProperty({
    description: 'Especie de la mascota',
    example: 'Perro',
    required: false
  })
  species?: string;

  @IsString({ message: 'La frecuencia de alimentación debe ser una cadena de texto' })
  @IsOptional()
  @ApiProperty({
    description: 'Frecuencia de alimentación',
    example: 'Diaria',
    required: false
  })
  dietFrequency?: string;

  @IsString({ message: 'Las enfermedades deben ser una cadena de texto' })
  @IsOptional()
  @ApiProperty({
    description: 'Enfermedades de la mascota',
    example: 'Diabetes, Artritis',
    required: false
  })
  diseases?: string;

  @IsArray({ message: 'Las vacunas deben ser un arreglo' })
  @IsOptional()
  @ApiProperty({
    description: 'Vacunas de la mascota',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Nombre de la vacuna',
          example: 'Rabia'
        },
        date: {
          type: 'string',
          description: 'Fecha de aplicación',
          example: '2023-07-27'
        }
      }
    },
    required: false
  })
  vaccines?: Array<{
    name?: string;
    date?: string;
  }>;

  @IsString({ message: 'Las observaciones deben ser una cadena de texto' })
  @IsOptional()
  @ApiProperty({
    description: 'Observaciones adicionales',
    example: 'Alguna observación adicional',
    required: false
  })
  observations?: string;
}

export class CreatePetTagDto {
  @ApiProperty({
    description: 'Datos para crear una nueva placa de mascota',
    required: true
  })
  @IsString({ message: 'El ID del QR debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El ID del QR es requerido' })
  @ApiProperty({
    description: 'ID único del QR asociado a la placa',
    example: '64c123456789abcdef012345',
    required: true
  })
  idQr: string;

  @IsString({ message: 'El PIN de activación debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El PIN de activación es requerido' })
  @ApiProperty({
    description: 'PIN de activación de la placa',
    example: '12345678',
    required: true
  })
  activationPin: string;

  @IsString({ message: 'El estado debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El estado es requerido' })
  status: 'RESERVADO' | 'ACTIVO' | 'INACTIVO';

  @IsOptional()
  @IsString({ message: 'La fecha de expiración debe ser una cadena de texto' })
  @ApiProperty({
    description: 'Fecha de expiración',
    example: '2023-07-27',
    required: false
  })
  expiration?: string;

  @IsOptional()
  petData?: PetData;

  @IsString({ message: 'El nombre de la tienda asignada debe ser una cadena de texto' })
  @IsOptional()
  @ApiProperty({
    description: 'Nombre de la tienda asignada a la placa',
    example: 'Tienda Mascotas Felices',
    required: false
  })
  assignedStoreName?: string;

  @IsString({ message: 'El nombre de la placa debe ser una cadena de texto' })
  @IsOptional()
  @ApiProperty({
    description: 'Nombre personalizado de la placa',
    example: 'Placa de Fido',
    required: false
  })
  name?: string;

  @IsBoolean({ message: 'El estado de favorito debe ser un booleano' })
  @IsOptional()
  @ApiProperty({
    description: 'Indica si la placa es favorita',
    example: false,
    required: false
  })
  isFavorite?: boolean;;
}
