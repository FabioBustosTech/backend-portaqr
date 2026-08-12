import { IsString, IsOptional, IsNumber, IsBoolean, ValidateNested, IsNotEmpty, IsUUID, IsDate } from 'class-validator';
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

  // SPEC-008 E2E: el frontend envía os y model (getDeviceInfo del frontend).
  // Antes se descartaban silenciosamente; con forbidNonWhitelisted rompían el
  // registro de escaneos. Ahora se aceptan y persisten.
  @ApiProperty({
    description: 'Sistema operativo detectado del dispositivo',
    example: 'Android 13'
  })
  @IsOptional()
  @IsString({ message: 'El sistema operativo debe ser una cadena de texto' })
  os?: string;

  @ApiProperty({
    description: 'Modelo del dispositivo',
    example: 'Pixel 7'
  })
  @IsOptional()
  @IsString({ message: 'El modelo debe ser una cadena de texto' })
  model?: string;
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

  // SPEC-008 E2E: el frontend envía scanDate (el schema scan.schema.ts L12 lo
  // persiste) pero el DTO no lo declaraba → forbidNonWhitelisted devolvía 400
  // y los escaneos no se registraban. Se añade al contrato real.
  @IsOptional()
  @IsDate({ message: 'La fecha de escaneo debe ser una fecha válida' })
  @Type(() => Date)
  scanDate?: Date;
  
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
  
  @IsOptional()
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

  // SPEC-008 E2E: el frontend envía ip y referer (datos de origen del escaneo).
  // Antes se descartaban silenciosamente (no estaban en el DTO ni en el schema);
  // con forbidNonWhitelisted rompían el registro. Ahora se aceptan y persisten.
  @ApiProperty({
    description: 'Dirección IP del visitante que escaneó',
    example: '190.45.12.3'
  })
  @IsOptional()
  @IsString({ message: 'La IP debe ser una cadena de texto' })
  ip?: string;

  @ApiProperty({
    description: 'Referer (origen de la visita) del escaneo',
    example: 'https://portaqr.cl/qr/abc'
  })
  @IsOptional()
  @IsString({ message: 'El referer debe ser una cadena de texto' })
  referer?: string;
}
