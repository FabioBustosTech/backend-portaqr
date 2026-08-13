import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { 
  IsArray,
  IsDate, 
  IsEnum, 
  IsNotEmpty, 
  IsOptional, 
  IsString, 
  ValidateNested,
  IsBoolean,
  ValidateIf
} from 'class-validator';
import { MethodActivation, DocumentType } from '../../domain/entities/qr-activate.entity';

export class QRElementDto {
  @ApiProperty({
    description: 'ID del código QR',
    example: '507f1f77bcf86cd799439011'
  })
  @IsString({ message: 'El ID del QR debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El ID del QR es requerido' })
  qrCode: string;

  // SPEC-009 B12: el cliente indica QUÉ plan quiere, no CUÁNTO cuesta.
  // El precio se toma del plan (fuente de verdad) y se congela como snapshot.
  @ApiProperty({
    description: 'ID del plan seleccionado (el precio lo calcula el backend)',
    example: '507f1f77bcf86cd799439012'
  })
  @IsString({ message: 'El plan debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El plan es requerido' })
  planId: string;

  @ApiProperty({
    description: 'Fecha de expiración',
    example: '2024-12-31T23:59:59.999Z'
  })
  @IsDate({ message: 'La fecha de expiración debe ser válida' })
  @Type(() => Date)
  @IsNotEmpty({ message: 'La fecha de expiración es requerida' })
  expirationDate: Date;

  @ApiProperty({
    description: 'Duración del plan',
    example: '12 meses'
  })
  @IsString({ message: 'La duración debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La duración es requerida' })
  duration: string;
}

export class InvoiceDataDto {
  @ApiProperty({
    description: 'RUT de la empresa',
    example: '76.123.456-7'
  })
  @IsString({ message: 'El RUT debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El RUT es requerido' })
  rut: string;

  @ApiProperty({
    description: 'Dirección de la empresa',
    example: 'Av. Principal 123'
  })
  @IsString({ message: 'La dirección debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La dirección es requerida' })
  direccion: string;

  @ApiProperty({
    description: 'Giro de la empresa',
    example: 'Comercio al por mayor'
  })
  @IsString({ message: 'El giro debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El giro es requerido' })
  giro: string;

  @ApiProperty({
    description: 'Razón social de la empresa',
    example: 'Empresa S.A.'
  })
  @IsString({ message: 'La razón social debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La razón social es requerida' })
  razonSocial: string;
}

export class CreateQrActivateDto {
  @ApiProperty({
    description: 'Método de activación',
    enum: MethodActivation,
    example: MethodActivation.WEBPAY
  })
  @IsEnum(MethodActivation, { message: 'El método de activación debe ser WEBPAY, TRANSFER o ADMIN' })
  @IsNotEmpty({ message: 'El método de activación es requerido' })
  methodActivation: MethodActivation;

  @ApiProperty({
    description: 'Token de la transacción Webpay (solo el token — el backend arma WebpayTransaction internamente)',
    example: 'tok-123456',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'El token de Webpay debe ser una cadena de texto' })
  webpayToken?: string;

  @ApiProperty({
    description: 'Lista de QRs a activar (el precio se calcula desde el plan — SPEC-009 B12)',
    type: [QRElementDto]
  })
  @IsArray({ message: 'La lista de QRs debe ser un array' })
  @ValidateNested({ each: true, message: 'Cada elemento de la lista de QRs debe ser válido' })
  @Type(() => QRElementDto)
  @IsNotEmpty({ message: 'La lista de QRs es requerida' })
  qrList: QRElementDto[];

  @ApiProperty({
    description: 'ID del usuario dueño de la activación (solo admin puede indicar un cliente)',
    example: '507f1f77bcf86cd799439011'
  })
  @IsString({ message: 'El ID de usuario debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El ID de usuario es requerido' })
  userId: string;

  @ApiProperty({
    description: 'Descripción adicional',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  description?: string;

  @ApiProperty({
    description: 'ID del administrador que crea la activación',
    example: '507f1f77bcf86cd799439011',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'El ID de administrador debe ser una cadena de texto' })
  adminId?: string;

  @ApiProperty({
    description: 'Descripción del administrador',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'La descripción del administrador debe ser una cadena de texto' })
  descriptionAdministrator?: string;

  @ApiProperty({
    description: 'Tipo de documento',
    enum: DocumentType,
    default: DocumentType.BOLETA
  })
  @IsEnum(DocumentType, { message: 'El tipo de documento debe ser BOLETA, FACTURA o NO_APLICA' })
  @IsNotEmpty({ message: 'El tipo de documento es requerido' })
  documentType: DocumentType;

  @ApiProperty({
    description: 'Datos de facturación',
    type: InvoiceDataDto,
    required: false
  })
  @ValidateIf((o) => o.documentType === DocumentType.FACTURA)
  @ValidateNested({ message: 'Los datos de facturación no son válidos' })
  @Type(() => InvoiceDataDto)
  invoiceData?: InvoiceDataDto;

  @ApiProperty({
    description: 'Indica si se debe enviar el documento',
    default: false
  })
  @IsBoolean({ message: 'El campo sendDocument debe ser un valor booleano' })
  @IsOptional()
  sendDocument?: boolean;
}
