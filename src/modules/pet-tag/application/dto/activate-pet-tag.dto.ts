// src/modules/pet-tag/application/dto/activate-pet-tag.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { 
  IsNotEmpty, 
  IsString, 
  IsUUID, 
  Length, 
  ValidateNested, 
  IsDefined 
} from 'class-validator';
import { Type } from 'class-transformer';
import { PetData } from './create-pet-tag.dto';

/**
 * DTO para el endpoint de activación de una PetTag.
 * Define la estructura y las reglas de validación para los datos
 * enviados desde el frontend al activar una placa.
 */
export class ActivatePetTagDto {
  @IsUUID('4', { message: 'El ID del QR debe ser un UUID v4 válido.' })
  @IsNotEmpty({ message: 'El ID del QR es requerido.' })
  @ApiProperty({
    description: 'El UUID único del código QR que se está activando.',
    example: '89302960-7799-43fe-b5a0-45d2295d539f',
  })
  readonly idQr: string;

  @IsString({ message: 'El PIN de activación debe ser una cadena de texto.' })
  @Length(6, 6, { message: 'El PIN de activación debe tener exactamente 6 caracteres.' })
  @IsNotEmpty({ message: 'El PIN de activación es requerido.' })
  @ApiProperty({
    description: 'El código de seguridad de 6 caracteres que se encuentra en el empaque del producto.',
    example: 'A4B1C9',
    minLength: 6,
    maxLength: 6,
  })
  readonly activationPin: string;

  @IsDefined({ message: 'Los datos de la mascota son requeridos.' })
  @ValidateNested({ message: 'Los datos de la mascota proporcionados no son válidos.' })
  @Type(() => PetData)
  @ApiProperty({
    description: 'El objeto completo con la información de la mascota a registrar.',
    type: () => PetData,
  })
  readonly petData: PetData;
}
