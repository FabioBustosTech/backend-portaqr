import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNotEmpty, IsString, IsNumber, IsBoolean, IsArray, ValidateNested, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { QrType } from 'src/qr/dto/create-qr.dto';

class DetailDto {
  @IsString({ message: 'detail debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'detail es requerido' })
  @ApiProperty({
    description: 'Detalle del plan',
    example: 'Acceso ilimitado'
  })
  detail: string;
}

export class CreatePlanDto {
  @IsString({ message: 'name debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'name es requerido' })
  @ApiProperty({
    description: 'Nombre del plan',
    example: 'Plan Premium'
  })
  readonly name: string;

  @IsString({ message: 'description debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'description es requerido' })
  @ApiProperty({
    description: 'Descripción del plan',
    example: 'Plan con características premium'
  })
  readonly description: string;

  @IsString({ message: 'status debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'status es requerido' })
  @ApiProperty({
    description: 'Estado del plan',
    example: 'active'
  })
  readonly status: string;

  @IsOptional()
  @IsDate({ message: 'endDate debe ser una fecha válida' })
  @Type(() => Date)
  @ApiProperty({
    description: 'Fecha de finalización del plan',
    example: '2024-12-31T23:59:59.999Z'
  })
  readonly endDate: Date;

  @IsOptional()
  @IsDate({ message: 'updatedDate debe ser una fecha válida' })
  @Type(() => Date)
  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2024-01-01T00:00:00.000Z'
  })
  readonly updatedDate: Date;

  @IsOptional()
  @IsDate({ message: 'createdDate debe ser una fecha válida' })
  @Type(() => Date)
  @ApiProperty({
    description: 'Fecha de creación',
    example: '2024-01-01T00:00:00.000Z'
  })
  readonly createdDate: Date;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetailDto)
  @ApiProperty({
    description: 'Detalles del plan',
    type: [DetailDto],
    example: [{ detail: 'Acceso ilimitado' }, { detail: 'Soporte 24/7' }]
  })
  readonly details: DetailDto[];

  @IsNumber({}, { message: 'precio debe ser un número' })
  @IsNotEmpty({ message: 'precio es requerido' })
  @ApiProperty({
    description: 'Precio del plan',
    example: 99.99
  })
  readonly price: number;

  @IsBoolean({ message: 'active debe ser un booleano' })
  @ApiProperty({
    description: 'Estado de activación del plan',
    default: true,
    example: true
  })
  readonly active: boolean;

  @IsBoolean({ message: 'populier debe ser un booleano' })
  @ApiProperty({
    description: 'Indica si el plan es popular',
    default: false,
    example: true
  })
  readonly populier: boolean;

  @IsEnum(QrType, { message: 'El tipo de QR debe ser uno de los siguientes valores: dynamic, static, whatsapp, email, call, wifi, texto, list, vcard, pet' })
  @IsNotEmpty({ message: 'El tipo de QR es requerido' })
  typeQr: string
}
