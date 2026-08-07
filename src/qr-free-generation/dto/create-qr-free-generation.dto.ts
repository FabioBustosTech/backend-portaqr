import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsObject, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class QrInformationDto {
  @ApiProperty({
    description: 'Tipo de QR',
    example: 'url'
  })
  @IsString()
  typeQr: string;

  @ApiProperty({
    description: 'Datos del QR',
    example: 'https://ejemplo.com'
  })
  @IsString()
  data: string;
}

class LocationDto {
  @ApiProperty({
    description: 'Latitud',
    example: 40.7128 
  })
  @IsOptional()
  latitude?: number;

  @ApiProperty({ 
    description: 'Longitud',
    example: -74.0060 
  })
  @IsOptional()
  longitude?: number;

  @ApiProperty({ 
    description: 'Precisión del GPS',
    example: 10 
  })
  @IsOptional()
  accuracy?: number;

  @ApiProperty({ example: 'España' })
  @IsOptional()
  country?: string;

  @ApiProperty({ example: 'Madrid' })
  @IsOptional()
  city?: string;
}

class DeviceDto {
  @ApiProperty({ example: 'iOS' })
  @IsOptional()
  platform?: string;

  @ApiProperty({ example: 'Safari' })
  @IsOptional()
  browser?: string;

  @ApiProperty({ example: true })
  @IsOptional()
  isMobile?: boolean;
}

export class CreateQrFreeGenerationDto {

  @ApiProperty({
    description: 'Email del usuario',
    example: 'usuario@ejemplo.com'
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Información del QR',
    type: QrInformationDto
  })
  @IsObject()
  @ValidateNested()
  @Type(() => QrInformationDto)
  information: QrInformationDto;

  @ApiProperty({
    description: 'Información de ubicación',
    type: LocationDto,
    required: false
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @ApiProperty({
    description: 'Información del dispositivo',
    type: DeviceDto,
    required: false
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DeviceDto)
  device?: DeviceDto;
}
