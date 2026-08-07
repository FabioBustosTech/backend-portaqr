// src/pet-tag/dto/query-reserved-tags.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer'; // 1. Importar Type

export class QueryReservedTagsDto {
  @ApiPropertyOptional({ description: 'Número de página', default: 1 })
  @IsOptional()
  @Type(() => Number) // 2. TRANSFORMAR el string a número
  @IsInt({ message: 'La página debe ser un número entero.' })
  @Min(1, { message: 'La página debe ser como mínimo 1.' })
  page?: number; // 3. Cambiar el tipo a `number`

  @ApiPropertyOptional({ description: 'Resultados por página', default: 100 })
  @IsOptional()
  @Type(() => Number) // 2. TRANSFORMAR el string a número
  @IsInt({ message: 'El límite debe ser un número entero.' })
  @Min(1, { message: 'El límite debe ser como mínimo 1.' })
  @Max(1000, { message: 'El límite no puede ser mayor a 1000.' })
  limit?: number; // 3. Cambiar el tipo a `number`

  @ApiPropertyOptional({ description: 'Buscar por ID o PIN de activación' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Estado de la placa', enum: ['RESERVADO', 'ACTIVO', 'INACTIVO'] })
  @IsOptional()
  @IsEnum(['RESERVADO', 'ACTIVO', 'INACTIVO'])
  status?: string;

  @ApiPropertyOptional({ description: 'Estado comercial de la placa', enum: ['EN_BODEGA', 'ASIGNADO_COMERCIO', 'VENDIDO'] })
  @IsOptional()
  @IsEnum(['EN_BODEGA', 'ASIGNADO_COMERCIO', 'VENDIDO'])
  commercialStatus?: string; // <-- NUEVO FILTRO

  @ApiPropertyOptional({ description: 'Filtrar por nombre de comercio asignado' })
  @IsOptional()
  @IsString()
  storeName?: string; // <-- NUEVO FILTRO

  @ApiPropertyOptional({ description: 'Fecha de creación mínima (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Fecha de creación máxima (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;


}