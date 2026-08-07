import { IsString, IsOptional, IsNumber, IsBoolean, ValidateNested, IsNotEmpty, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class LocationDto {
  @ApiProperty({
    description: 'Latitud de la ubicación',
    example: 40.7128
  })
  @IsNumber({}, { message: 'La latitud debe ser un número' })
  latitude: number;

  @ApiProperty({
    description: 'Longitud de la ubicación',
    example: -74.0060
  })
  @IsNumber({}, { message: 'La longitud debe ser un número' })
  longitude: number;

  @ApiProperty({
    description: 'Precisión de la ubicación en metros',
    example: 10
  })
  @IsOptional()
  @IsNumber({}, { message: 'La precisión debe ser un número' })
  accuracy?: number;

  @ApiProperty({
    description: 'País donde se realizó el escaneo',
    example: 'España'
  })
  @IsOptional()
  @IsString({ message: 'El país debe ser una cadena de texto' })
  country?: string;

  @ApiProperty({
    description: 'Ciudad donde se realizó el escaneo',
    example: 'Madrid'
  })
  @IsOptional()
  @IsString({ message: 'La ciudad debe ser una cadena de texto' })
  city?: string;
}

class DeviceInfoDto {
  @ApiProperty({
    description: 'Sistema operativo del dispositivo',
    example: 'iOS'
  })
  @IsString({ message: 'La plataforma debe ser una cadena de texto' })
  platform: string;

  @ApiProperty({
    description: 'Navegador utilizado',
    example: 'Safari'
  })
  @IsString({ message: 'El navegador debe ser una cadena de texto' })
  browser: string;

  @ApiProperty({
    description: 'Indica si es un dispositivo móvil',
    example: true
  })
  @IsBoolean({ message: 'El indicador de móvil debe ser un valor booleano' })
  isMobile: boolean;
}

export class CreateScanDto {
  @IsString({ message: 'idQr debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'idQr es requerido' })
  @IsUUID('4', { message: 'idQr debe ser un UUID válido' })
  @ApiProperty({
    description: 'Identificador único del QR',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  readonly idQr: string;
  
  @ApiProperty({
    description: 'Información de ubicación del escaneo'
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @ApiProperty({
    description: 'Información del dispositivo que realizó el escaneo'
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  device?: DeviceInfoDto;

  @ApiProperty({
    description: 'Indica si el escaneo fue exitoso',
    example: true,
    default: true
  })
  @IsOptional()

  @ApiProperty({
    description: 'Origen del escaneo',
    example: 'web',
    default: 'web'
  })
  @IsString({ message: 'El origen debe ser una cadena de texto' })
  @IsOptional()
  origen?: string;
  
  @IsBoolean({ message: 'El indicador de éxito debe ser un valor booleano' })
  successful?: boolean;

  @ApiProperty({
    description: 'Mensaje de error en caso de fallo',
    example: 'Error al procesar el código QR'
  })
  @IsOptional()
  @IsString({ message: 'El mensaje de error debe ser una cadena de texto' })
  errorMessage?: string;
  
  @ApiProperty({
    description: 'Identificador único del usuario que realizó el escaneo',
    example: '1234567890'
  })
  @IsOptional()
  @IsString({ message: 'El identificador único del usuario debe ser una cadena de texto' })
  userIdScan?: string;
  
  @ApiProperty({
    description: 'Identificador del último escaneo realizado',
    example: '1234567890'
  })
  @IsOptional()
  @IsString({ message: 'El identificador del último escaneo debe ser una cadena de texto' })
  lastScanId?: string;

  @ApiProperty({
    description: 'Identificador del usuario que posee el QR',
    example: '1234567890'
  })
  @IsString({ message: 'El identificador del usuario debe ser una cadena de texto' })
  userId: string;
}
