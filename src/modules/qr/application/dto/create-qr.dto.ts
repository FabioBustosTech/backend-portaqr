import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNotEmpty, IsString, IsUrl, IsNumber, IsOptional, IsBoolean, ValidateNested, IsEnum, Matches, MaxLength, IsArray, ValidateIf, IsObject, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export enum QrType {
  DYNAMIC = 'dynamic',
  STATIC = 'static',
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  CALL = 'call',
  WIFI = 'wifi',
  TEXTO = 'texto',
  LIST = 'list',
  VCARD = 'vcard',
  PET = 'pet',
  PHONE = 'phone',
  MAP = 'map'
}

export enum VCardEmailType {
  WORK = 'work',
  HOME = 'home'
}

export enum VCardPhoneType {
  CELL = 'cell',
  WORK = 'work',
  HOME = 'home',
  FAX = 'fax'
}

export enum VCardAddressType {
  WORK = 'work',
  HOME = 'home'
}

export class WifiData {
  @IsString({ message: 'El nombre de la red WiFi (SSID) debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre de la red WiFi (SSID) es requerido' })
  ssid: string;

  @IsEnum(['WPA', 'WPA2', 'WEP'], { message: 'El tipo de seguridad debe ser WPA, WPA2 o WEP' })
  security: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  password: string;
}

export class VCard {
  @IsString({ message: 'La versión debe ser una cadena de texto' })
  @IsOptional()
  version?: string = '4.0';

  @IsString({ message: 'El nombre completo debe ser una cadena de texto' })
  @IsOptional()
  fn?: string;

  @IsObject({ message: 'El nombre debe ser un objeto' })
  @IsOptional()
  n?: {
    lastName?: string;
    firstName?: string;
    additional?: string;
    prefix?: string;
    suffix?: string;
  };

  @IsString({ message: 'El apodo debe ser una cadena de texto' })
  @IsOptional()
  nickname?: string;

  @IsEnum(['M', 'F', 'O', 'N', 'U', ''], { message: 'El género debe ser M, F, O, N, U o vacío' })
  @IsOptional()
  gender?: string;

  @IsString({ message: 'La fecha de cumpleaños debe ser una cadena de texto' })
  @IsOptional()
  bday?: string;

  @IsString({ message: 'La fecha de aniversario debe ser una cadena de texto' })
  @IsOptional()
  anniversary?: string;

  @IsString({ message: 'La organización debe ser una cadena de texto' })
  @IsOptional()
  org?: string;

  @IsString({ message: 'El título debe ser una cadena de texto' })
  @IsOptional()
  title?: string;

  @IsString({ message: 'El rol debe ser una cadena de texto' })
  @IsOptional()
  role?: string;

  @IsArray({ message: 'Los correos electrónicos deben ser un arreglo' })
  @IsOptional()
  emails?: Array<{
    type: VCardEmailType;
    value: string;
    pref?: number;
  }>;

  @IsArray({ message: 'Los teléfonos deben ser un arreglo' })
  @IsOptional()
  phones?: Array<{
    type: VCardPhoneType;
    value: string;
    pref?: number;
  }>;

  @IsArray({ message: 'Las direcciones deben ser un arreglo' })
  @IsOptional()
  addresses?: Array<{
    type: VCardAddressType;
    street?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
    label?: string;
  }>;

  @IsArray({ message: 'Las URLs deben ser un arreglo' })
  @IsOptional()
  urls?: string[];

  @IsString({ message: 'La foto debe ser una cadena de texto' })
  @IsOptional()
  photo?: string;

  @IsString({ message: 'El logo debe ser una cadena de texto' })
  @IsOptional()
  logo?: string;

  @IsString({ message: 'La nota debe ser una cadena de texto' })
  @IsOptional()
  note?: string;

  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsOptional()
  description?: string;

  @IsString({ message: 'El UID debe ser una cadena de texto' })
  @IsOptional()
  uid?: string;

  @IsString({ message: 'La revisión debe ser una cadena de texto' })
  @IsOptional()
  rev?: string;
}

export class ListUrlData {
  @IsOptional()
  @IsString()
  itemId?: string; // SPEC-005 RF-12: identificador estable del item dentro de urlList[]

  @ValidateIf((o) => o.typeUrl === 'pdf')
  @IsOptional()
  @IsUrl({}, { message: 'La URL del documento debe ser válida' })
  documentUrl?: string | null; // SPEC-005 RF-2: URL pública R2 del PDF (solo typeUrl === 'pdf')

  @ValidateIf((o) => o.typeUrl === 'pdf')
  @IsOptional()
  @IsString({ message: 'El título del documento debe ser una cadena de texto' })
  @MaxLength(60, { message: 'El título del documento no puede exceder los 60 caracteres' })
  title?: string; // SPEC-022 RF-1/RF-3: texto descriptivo del contenido (solo typeUrl === 'pdf')

  @IsOptional()
  @Matches(/^((https?:\/\/[^\s]+|tel:\+\d{1,3}\d{4,14}))$/, {
    message: 'Debe comenzar con http://, https:// o tel: seguido de un número telefónico válido'
  })
  url?: string;

  @IsOptional()
  @ValidateNested({ message: 'Los datos de la tarjeta de contacto deben ser válidos' })
  @Type(() => VCard)
  vcard?: VCard;

  @IsString({ message: 'El tipo de URL debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El tipo de URL es requerido' })
  typeUrl: string;
}



export class PetData {
  @IsString({ message: 'El nombre del propietario debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre del propietario es requerido' })
  ownerName: string;

  @IsString({ message: 'La dirección debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La dirección es requerida' })
  address: string;

  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El teléfono es requerido' })
  phone: string;

  @IsString({ message: 'El nombre de la mascota debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre de la mascota es requerido' })
  petName: string;

  @IsString({ message: 'La fecha de nacimiento debe ser una cadena de texto' })
  @IsOptional()
  birthDate?: string;

  @IsString({ message: 'La raza debe ser una cadena de texto' })
  @IsOptional()
  breed?: string;

  @IsString({ message: 'El género debe ser una cadena de texto' })
  @IsOptional()
  gender?: string;

  @IsString({ message: 'La especie debe ser una cadena de texto' })
  @IsOptional()
  species?: string;

  @IsString({ message: 'La frecuencia de alimentación debe ser una cadena de texto' })
  @IsOptional()
  dietFrequency?: string;

  @IsString({ message: 'Las enfermedades deben ser una cadena de texto' })
  @IsOptional()
  diseases?: string;

  @IsArray({ message: 'Las vacunas deben ser un arreglo' })
  @IsOptional()
  vaccines?: Array<{
    name?: string;
    date?: string;
  }>;

  @IsString({ message: 'Las observaciones deben ser una cadena de texto' })
  @IsOptional()
  observations?: string;
}

export class QrData {
  @ValidateIf(o => ['dynamic', 'static'].includes(o.typeQr))
  @IsUrl({}, { message: 'La URL debe ser válida' })
  @IsNotEmpty({ message: 'La URL es requerida para QRs de tipo dynamic o static' })
  @Matches(/^https?:\/\//, { message: 'La URL debe comenzar con http:// o https://' })
  url?: string;

  @ValidateIf(o => o.typeQr === 'whatsapp')
  @IsString({ message: 'La URL de WhatsApp debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La URL de WhatsApp es requerida para QRs de tipo whatsapp' })
  @Matches(/^https:\/\/wa\.me\/\d{11}(\?text=[^]*)?$/, { 
    message: 'La URL de WhatsApp debe tener el formato https://wa.me/XXXXXXXXXXX (11 números) y opcionalmente ?text=mensaje' 
  })
  whatsappUrl?: string;

  @ValidateIf(o => o.typeQr === 'email')
  @IsString({ message: 'La URL del email debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La URL del email es requerida para QRs de tipo email' })
  @Matches(/^mailto:[\w-\.]+@([\w-]+\.)+[\w-]{2,4}(\?subject=[^]*)?$/, {
    message: 'El email debe tener el formato mailto:correo@dominio.com y opcionalmente ?subject=asunto'
  })
  emailUrl?: string;

  @ValidateIf(o => o.typeQr === 'call')
  @IsString({ message: 'El número de teléfono debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El número de teléfono es requerido para QRs de tipo call' })
  @Matches(/^tel:(\d{9}|\d{11})$/, {
    message: 'El número debe tener el formato tel:XXXXXXXXX (9 dígitos) o tel:XXXXXXXXXXX (11 dígitos)'
  })
  phoneUrl?: string;

  @ValidateIf(o => o.typeQr === 'wifi')
  @ValidateNested({ message: 'Los datos de WiFi deben ser válidos' })
  @Type(() => WifiData)
  wifiData?: WifiData;

  @ValidateIf(o => o.typeQr === 'texto')
  @IsString({ message: 'El texto debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El texto es requerido para QRs de tipo texto' })
  @MaxLength(10000, { message: 'El texto no puede exceder los 10000 caracteres' })
  text?: string;

  @ValidateIf(o => o.typeQr === 'list')
  @IsArray({ message: 'La lista de URLs debe ser un arreglo' })
  @ValidateNested({ each: true, message: 'Cada elemento de la lista debe ser válido' })
  @Type(() => ListUrlData)
  urlList?: ListUrlData[];

  // SPEC-002: imagen de portada del QR multilink (URL pública R2).
  // Solo se acepta para typeQr === 'list'; se ignora para los demás tipos (RF-4).
  @ValidateIf(o => o.typeQr === 'list')
  @IsOptional()
  @IsUrl({}, { message: 'La URL de la imagen de portada debe ser válida' })
  listImageUrl?: string | null;

  @ValidateIf(o => o.typeQr === 'vcard')
  @ValidateNested({ message: 'Los datos de la tarjeta de contacto deben ser válidos' })
  @Type(() => VCard)
  // SPEC-008 E2E: el contrato real FE↔BD es `vcardData` (schema qr.schema.ts L132,
  // frontend envía/lee vcardData). El nombre `vcard` nunca se usó en la práctica
  // y forbidNonWhitelisted lo hacía fallar con 400 → renombrado al contrato real.
  vcardData?: VCard;

  @ValidateIf(o => o.typeQr === 'pet')
  @ValidateNested({ message: 'Los datos de la mascota deben ser válidos' })
  @Type(() => PetData)
  petData?: PetData;

  @IsEnum(QrType, { message: 'El tipo de QR debe ser uno de los siguientes valores: dynamic, static, whatsapp, email, call, wifi, texto, list, vcard, pet, phone, map' })
  @IsNotEmpty({ message: 'El tipo de QR es requerido' })
  typeQr: QrType;
}

export class CreateQrDto {
  @IsString({ message: 'El ID del QR debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El ID del QR es requerido' })
  @IsUUID('4', { message: 'El ID del QR debe ser un UUID v4 válido' })
  @ApiProperty({
    description: 'Identificador único del QR',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  readonly idQr: string;

  @IsString({ message: 'El ID del usuario debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El ID del usuario es requerido' })
  @ApiProperty({
    description: 'ID del usuario que crea el QR',
    example: '507f1f77bcf86cd799439011'
  })
  readonly userId: string;

  @IsOptional()
  @IsDate({ message: 'La fecha de expiración debe ser una fecha válida' })
  @Type(() => Date)
  @ApiProperty({
    description: 'Fecha de expiración del QR',
    required: false,
    example: '2024-12-31T23:59:59.999Z'
  })
  expiration?: Date;

  @IsOptional()
  @IsNumber({}, { message: 'La cantidad de actualizaciones por mes debe ser un número' })
  @ApiProperty({
    description: 'Cantidad de actualizaciones por mes',
    required: false,
    default: 0,
    example: 5
  })
  quantityUpdateMonth?: number;

  @IsOptional()
  @IsBoolean({ message: 'El estado de activación debe ser un valor booleano' })
  @ApiProperty({
    description: 'Estado de activación del QR',
    required: false,
    default: false,
    example: true
  })
  active?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'El estado de favorito debe ser un valor booleano' })
  @ApiProperty({
    description: 'Indica si el QR es favorito',
    required: false,
    default: false,
    example: true
  })
  isFavorite?: boolean;

  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  description?: string;

  @IsOptional()
  @IsBoolean({ message: 'El modo antiguo debe ser un valor booleano' })
  @ApiProperty({
    description: 'Indica si el QR está en modo antiguo',
    required: false,
    default: false,
    example: true
  })
  isOldMode?: boolean;

  @ApiProperty({
    description: 'Datos específicos del QR según su tipo',
    type: QrData
  })
  @ValidateNested({ message: 'Los datos específicos del QR deben ser válidos' })
  @Type(() => QrData)
  @IsNotEmpty({ message: 'Los datos específicos del QR son requeridos' })
  data: QrData;

  @IsEnum(QrType, { message: 'El tipo de QR debe ser uno de los siguientes valores: dynamic, static, whatsapp, email, call, wifi, texto, list, vcard, pet, phone, map' })
  @IsNotEmpty({ message: 'El tipo de QR es requerido' })
  typeQr: QrType;
}
