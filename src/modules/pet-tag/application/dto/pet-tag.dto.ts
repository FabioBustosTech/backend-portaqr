import { ApiProperty } from '@nestjs/swagger';
import { PetData } from './create-pet-tag.dto';

export class PetTagDto {
  @ApiProperty({ description: 'ID del documento' })
  id: string;

  @ApiProperty({ description: 'ID único del QR asociado a la placa' })
  idQr: string;

  @ApiProperty({ description: 'ID del usuario propietario' })
  userId: string | null;

  @ApiProperty({ description: 'PIN de activación de la placa' })
  activationPin: string;

  @ApiProperty({
    description: 'Estado de la placa',
    enum: ['RESERVADO', 'ACTIVO', 'INACTIVO']
  })
  status: string;

  @ApiProperty({ description: 'Datos de la mascota' })
  petData: PetData;

  @ApiProperty({ description: 'Fecha de expiración de la suscripción' })
  expiration: string | null;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt: string;

  @ApiProperty({ description: 'Fecha de actualización' })
  updatedAt: string;
}
