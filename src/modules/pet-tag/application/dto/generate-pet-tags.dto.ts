// src/modules/pet-tag/application/dto/generate-pet-tags.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Max } from 'class-validator';

/**
 * DTO para el endpoint administrativo de generación de PetTags en masa.
 * Define la cantidad de placas a crear en una sola petición.
 */
export class GeneratePetTagsDto {
  @IsInt({ message: 'La cantidad debe ser un número entero.' })
  @IsPositive({ message: 'La cantidad debe ser un número positivo.' })
  @Max(10000, { message: 'No se pueden generar más de 10,000 placas a la vez para evitar sobrecargar el sistema.' })
  @IsNotEmpty({ message: 'La cantidad es requerida.' })
  @ApiProperty({
    description: 'El número de placas de mascota "reservadas" que se deben generar en la base de datos.',
    example: 1000,
    minimum: 1,
    maximum: 10000,
    type: Number,
  })
  readonly quantity: number;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'El nombre del comercio al que se asignarán las placas.',
    example: 'Mi Comercio',
    required: false,
  })
  readonly assignedStoreName?: string;
}
