import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { 
  IsArray,
  IsDate, 
  IsEnum, 
  IsNotEmpty, 
  IsNumber, 
  IsOptional, 
  IsString, 
  Min,
  Validate,
  ValidateNested,
  ValidationArguments,
  IsBoolean,
  ValidateIf
} from 'class-validator';
import { MethodActivation, ActivationSate, WebpayState, DocumentType } from '../entities/qr-activate.entity';

export class TransferDateDto {
  @ApiProperty({
    description: 'Monto de la transferencia',
    example: 99.99
  })
  @IsNumber({}, { message: 'El monto debe ser un número' })
  @Min(0, { message: 'El monto debe ser mayor a 0' })
  @IsNotEmpty({ message: 'El monto es requerido' })
  tranferAmount: number;

  @ApiProperty({
    description: 'Cuenta de origen',
    example: '1234567890'
  })
  @IsString({ message: 'La cuenta de origen debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La cuenta de origen es requerida' })
  originAccount: string;

  @ApiProperty({
    description: 'Cuenta de destino',
    example: '0987654321'
  })
  @IsString({ message: 'La cuenta de destino debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La cuenta de destino es requerida' })
  destinationAccount: string;

  @ApiProperty({
    description: 'Banco de origen',
    example: 'Banco Estado'
  })
  @IsString({ message: 'El banco de origen debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El banco de origen es requerido' })
  originBank: string;

  @ApiProperty({
    description: 'Banco de destino',
    example: 'Banco Santander'
  })
  @IsString({ message: 'El banco de destino debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El banco de destino es requerido' })
  destinationBank: string;

  @ApiProperty({
    description: 'Fecha de transacción',
    example: '2024-03-21T10:00:00Z'
  })
  @IsDate({ message: 'La fecha debe ser válida' })
  @Type(() => Date)
  transationDate: Date;
}

export class WebpayDataDto {
  @ApiProperty({
    description: 'ID de la transacción',
    example: 'tx-123456'
  })
  @IsString({ message: 'El ID debe ser una cadena de texto' })
  @IsOptional()
  id?: string;

  @ApiProperty({
    description: 'Fecha de la transacción',
    example: '2024-03-21T10:00:00Z'
  })
  @IsDate({ message: 'La fecha debe ser válida' })
  @IsOptional()
  @Type(() => Date)
  date?: Date;

  @ApiProperty({
    description: 'Estado de la transacción Webpay',
    enum: WebpayState,
    example: WebpayState.ACTIVE
  })
  @IsEnum(WebpayState, { message: 'El estado debe ser válido' })
  @IsOptional()
  state?: WebpayState;
}

export class PriceDataDto {
  @ApiProperty({
    description: 'Precio total',
    example: 99.99
  })
  @IsNumber({}, { message: 'El precio total debe ser un número' })
  @Min(0, { message: 'El precio total debe ser mayor a 0' })
  @IsNotEmpty({ message: 'El precio total es requerido' })
  TotalPrice: number;

  @ApiProperty({
    description: 'Descuento total',
    example: 10
  })
  @IsNumber({}, { message: 'El descuento debe ser un número' })
  @Min(0, { message: 'El descuento debe ser mayor o igual a 0' })
  @IsOptional()
  TotalDiscount?: number;

  @ApiProperty({
    description: 'Impuesto total',
    example: 19
  })
  @IsNumber({}, { message: 'El impuesto debe ser un número' })
  @Min(0, { message: 'El impuesto debe ser mayor o igual a 0' })
  @IsNotEmpty({ message: 'El impuesto total es requerido' })
  TotalTax: number;
}

export class QRElementDto {
  @ApiProperty({
    description: 'ID del código QR',
    example: '507f1f77bcf86cd799439011'
  })
  @IsString({ message: 'El ID del QR debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El ID del QR es requerido' })
  qrCode: string;

  @ApiProperty({
    description: 'Precio del QR',
    example: 99.99
  })
  @IsNumber({}, { message: 'El precio debe ser un número' })
  @Min(0, { message: 'El precio debe ser mayor a 0' })
  @IsNotEmpty({ message: 'El precio es requerido' })
  price: number;

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
    description: 'Estado de activación',
    enum: ActivationSate,
    default: ActivationSate.PENDING,
    example: ActivationSate.PENDING
  })
  @IsEnum(ActivationSate, { message: 'El estado debe ser PENDING, ACTIVE o ADMIN' })
  @IsOptional()
  state?: ActivationSate = ActivationSate.PENDING;

  @ApiProperty({
    description: 'Fecha de activación',
    example: '2024-03-21T10:00:00Z'
  })
  @IsDate({ message: 'La fecha de activación debe ser válida' })
  @IsOptional()
  @Type(() => Date)
  activationDate?: Date;

  @ApiProperty({
    description: 'Datos de transferencia',
    type: TransferDateDto,
    required: false
  })
  @IsOptional()
  @ValidateNested({ message: 'Los datos de transferencia no son válidos' })
  @Type(() => TransferDateDto)
  TransferDate?: TransferDateDto;

  @ApiProperty({
    description: 'Datos de transacción Webpay',
    type: WebpayDataDto,
    required: false
  })
  @IsOptional()
  @ValidateNested({ message: 'Los datos de Webpay no son válidos' })
  @Type(() => WebpayDataDto)
  WebpayTransaction?: WebpayDataDto;

  @ApiProperty({
    description: 'Datos de precio',
    type: PriceDataDto
  })
  @ValidateNested({ message: 'Los datos de precio no son válidos' })
  @Type(() => PriceDataDto)
  @IsNotEmpty({ message: 'Los datos de precio son requeridos' })
  @Validate((value: PriceDataDto, args: ValidationArguments) => {
    const dto = args.object as CreateQrActivateDto;
    if (!dto.qrList || dto.qrList.length === 0) return false;

    const sumQrPrices = dto.qrList.reduce((sum, qr) => sum + qr.price, 0);
  
    return Math.abs(sumQrPrices - value.TotalPrice) < 0.01; 
  }, {
    message: 'El precio total debe ser igual a la suma de los precios de los QRs con el 19% incluido'
  })
  price: PriceDataDto;

  @ApiProperty({
    description: 'Lista de QRs',
    type: [QRElementDto]
  })
  @IsArray({ message: 'La lista de QRs debe ser un array' })
  @ValidateNested({ each: true, message: 'Cada elemento de la lista de QRs debe ser válido' })
  @Type(() => QRElementDto)
  @IsNotEmpty({ message: 'La lista de QRs es requerida' })
  qrList: QRElementDto[];

  @ApiProperty({
    description: 'ID del usuario',
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
    description: 'Fecha de última actualización',
    example: '2024-03-21T10:00:00Z',
    required: false
  })
  @IsOptional()
  @IsDate({ message: 'La fecha de actualización debe ser válida' })
  @Type(() => Date)
  updatedAt?: Date;
  
  @ApiProperty({
    description: 'Fecha de creación',
    example: '2024-03-21T10:00:00Z',
    required: false
  })
  @IsOptional()
  @IsDate({ message: 'La fecha de creación debe ser válida' })
  @Type(() => Date)
  createdAt?: Date;

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
