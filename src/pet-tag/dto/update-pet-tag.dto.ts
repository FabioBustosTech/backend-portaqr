import { PartialType } from '@nestjs/swagger';
import { CreatePetTagDto } from './create-pet-tag.dto';
import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CommercialStatus } from '../enums/commercial-status.enum';

export class UpdatePetTagDto extends PartialType(CreatePetTagDto) {
  @IsEnum(CommercialStatus)
  @IsOptional()
  @ApiProperty({
    description: 'Estado comercial de la placa',
    enum: CommercialStatus,
    example: CommercialStatus.EN_BODEGA,
    required: false
  })
  commercialStatus?: CommercialStatus;

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
  isFavorite?: boolean;
}
