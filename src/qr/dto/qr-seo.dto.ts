import { ApiProperty } from '@nestjs/swagger';

export class QrSeoDto {
  @ApiProperty({
    description: 'ID único del QR',
    example: '89302960-7799-43fe-b5a0-45d2295d539f'
  })
  id: string;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2024-05-21T18:45:12.345Z'
  })
  updatedAt: Date;
}
