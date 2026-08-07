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
import { MethodActivation, ActivationState, WebpayState, DocumentType } from '../../domain/entities/qr-activate.entity';

export class TransferDateDto {
  @ApiProperty({
    description: 'Monto de la transferencia',
    example: 99.99
  })
  @IsNumber({}, { message: 'El monto debe ser un nÃºmero' })
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
    description: 'Fecha de transacciÃ³n',
    example: '2024-03-21T10:00:00Z'
  })
  @IsDate({ message: 'La fecha debe ser vÃ¡lida' })
  @Type(() => Date)
  transationDate: Date;
}

export class WebpayDataDto {
  @ApiProperty({
    description: 'ID de la transacciÃ³n',
    example: 'tx-123456'
  })
  @IsString({ message: 'El ID debe ser una cadena de texto' })
  @IsOptional()
  id?: string;

  @ApiProperty({
    description: 'Fecha de la transacciÃ³n',
    example: '2024-03-21T10:00:00Z'
  })
  @IsDate({ message: 'La fecha debe ser vÃ¡lida' })
  @IsOptional()
  @Type(() => Date)
  date?: Date;

  @ApiProperty({
    description: 'Estado de la transacciÃ³n Webpay',
    enum: WebpayState,
    example: WebpayState.ACTIVE
  })
  @IsEnum(WebpayState, { message: 'El estado debe ser vÃ¡lido' })
  @IsOptional()
  state?: WebpayState;
}

export class PriceDataDto {
  @ApiProperty({
    description: 'Precio total',
    example: 99.99
  })
  @IsNumber({}, { message: 'El precio total debe ser un nÃºmero' })
  @Min(0, { message: 'El precio total debe ser mayor a 0' })
  @IsNotEmpty({ message: 'El precio total es requerido' })
  TotalPrice: number;

  @ApiProperty({
    description: 'Descuento total',
    example: 10
  })
  @IsNumber({}, { message: 'El descuento debe ser un nÃºmero' })
  @Min(0, { message: 'El descuento debe ser mayor o igual a 0' })
  @IsOptional()
  TotalDiscount?: number;

  @ApiProperty({
    description: 'Impuesto total',
    example: 19
  })
  @IsNumber({}, { message: 'El impuesto debe ser un nÃºmero' })
  @Min(0, { message: 'El impuesto debe ser mayor o igual a 0' })
  @IsNotEmpty({ message: 'El impuesto total es requerido' })
  TotalTax: number;
}

export class QRElementDto {
  @ApiProperty({
    description: 'ID del cÃ³digo QR',
    example: '507f1f77bcf86cd799439011'
  })
  @IsString({ message: 'El ID del QR debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El ID del QR es requerido' })
  qrCode: string;

  @ApiProperty({
    description: 'Precio del QR',
    example: 99.99
  })
  @IsNumber({}, { message: 'El precio debe ser un nÃºmero' })
  @Min(0, { message: 'El precio debe ser mayor a 0' })
  @IsNotEmpty({ message: 'El precio es requerido' })
  price: number;

  @ApiProperty({
    description: 'Fecha de expiraciÃ³n',
    example: '2024-12-31T23:59:59.999Z'
  })
  @IsDate({ message: 'La fecha de expiraciÃ³n debe ser vÃ¡lida' })
  @Type(() => Date)
  @IsNotEmpty({ message: 'La fecha de expiraciÃ³n es requerida' })
  expirationDate: Date;

  @ApiProperty({
    description: 'DuraciÃ³n del plan',
    example: '12 meses'
  })
  @IsString({ message: 'La duraciÃ³n debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La duraciÃ³n es requerida' })
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
    description: 'DirecciÃ³n de la empresa',
    example: 'Av. Principal 123'
  })
  @IsString({ message: 'La direcciÃ³n debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La direcciÃ³n es requerida' })
  direccion: string;

  @ApiProperty({
    description: 'Giro de la empresa',
    example: 'Comercio al por mayor'
  })
  @IsString({ message: 'El giro debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El giro es requerido' })
  giro: string;

  @ApiProperty({
    description: 'RazÃ³n social de la empresa',
    example: 'Empresa S.A.'
  })
  @IsString({ message: 'La razÃ³n social debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La razÃ³n social es requerida' })
  razonSocial: string;
}

export class CreateQrActivateDto {
  @ApiProperty({
    description: 'MÃ©todo de activaciÃ³n',
    enum: MethodActivation,
    example: MethodActivation.WEBPAY
  })
  @IsEnum(MethodActivation, { message: 'El mÃ©todo de activaciÃ³n debe ser WEBPAY, TRANSFER o ADMIN' })
  @IsNotEmpty({ message: 'El mÃ©todo de activaciÃ³n es requerido' })
  methodActivation: MethodActivation;

  @ApiProperty({
    description: 'Estado de activaciÃ³n',
    enum: ActivationState,
    default: ActivationState.PENDING,
    example: ActivationState.PENDING
  })
  @IsEnum(ActivationState, { message: 'El estado debe ser PENDING, ACTIVE o ADMIN' })
  @IsOptional()
  state?: ActivationState = ActivationState.PENDING;

  @ApiProperty({
    description: 'Fecha de activaciÃ³n',
    example: '2024-03-21T10:00:00Z'
  })
  @IsDate({ message: 'La fecha de activaciÃ³n debe ser vÃ¡lida' })
  @IsOptional()
  @Type(() => Date)
  activationDate?: Date;

  @ApiProperty({
    description: 'Datos de transferencia',
    type: TransferDateDto,
    required: false
  })
  @IsOptional()
  @ValidateNested({ message: 'Los datos de transferencia no son vÃ¡lidos' })
  @Type(() => TransferDateDto)
  TransferDate?: TransferDateDto;

  @ApiProperty({
    description: 'Datos de transacciÃ³n Webpay',
    type: WebpayDataDto,
    required: false
  })
  @IsOptional()
  @ValidateNested({ message: 'Los datos de Webpay no son vÃ¡lidos' })
  @Type(() => WebpayDataDto)
  WebpayTransaction?: WebpayDataDto;

  @ApiProperty({
    description: 'Datos de precio',
    type: PriceDataDto
  })
  @ValidateNested({ message: 'Los datos de precio no son vÃ¡lidos' })
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
  @ValidateNested({ each: true, message: 'Cada elemento de la lista de QRs debe ser vÃ¡lido' })
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
    description: 'DescripciÃ³n adicional',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'La descripciÃ³n debe ser una cadena de texto' })
  description?: string;

  @ApiProperty({
    description: 'ID del administrador que crea la activaciÃ³n',
    example: '507f1f77bcf86cd799439011',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'El ID de administrador debe ser una cadena de texto' })
  adminId?: string;

  @ApiProperty({
    description: 'DescripciÃ³n del administrador',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'La descripciÃ³n del administrador debe ser una cadena de texto' })
  descriptionAdministrator?: string;

  @ApiProperty({
    description: 'Fecha de Ãºltima actualizaciÃ³n',
    example: '2024-03-21T10:00:00Z',
    required: false
  })
  @IsOptional()
  @IsDate({ message: 'La fecha de actualizaciÃ³n debe ser vÃ¡lida' })
  @Type(() => Date)
  updatedAt?: Date;
  
  @ApiProperty({
    description: 'Fecha de creaciÃ³n',
    example: '2024-03-21T10:00:00Z',
    required: false
  })
  @IsOptional()
  @IsDate({ message: 'La fecha de creaciÃ³n debe ser vÃ¡lida' })
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
    description: 'Datos de facturaciÃ³n',
    type: InvoiceDataDto,
    required: false
  })
  @ValidateIf((o) => o.documentType === DocumentType.FACTURA)
  @ValidateNested({ message: 'Los datos de facturaciÃ³n no son vÃ¡lidos' })
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
