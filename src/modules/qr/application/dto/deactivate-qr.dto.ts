import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * SPEC-014: motivo obligatorio de la desactivación admin de un QR.
 * Simétrico al `descriptionAdministrator` de la activación — trazabilidad.
 */
export class DeactivateQrDto {
  @ApiProperty({
    description: 'Motivo de la desactivación (solo visible para admin, nunca público)',
    minLength: 5,
    maxLength: 500,
    example: 'Cliente no renovó el plan',
  })
  @IsString({ message: 'El motivo debe ser un texto.' })
  @MinLength(5, { message: 'El motivo debe tener al menos 5 caracteres.' })
  @MaxLength(500, { message: 'El motivo no puede superar los 500 caracteres.' })
  reason: string;
}
