/** Entidad de dominio pura de una activación de QR */

export enum DocumentType {
  BOLETA = 'BOLETA',
  FACTURA = 'FACTURA',
  NO_APLICA = 'N/A',
}

export enum MethodActivation {
  WEBPAY = 'WEBPAY',
  TRANSFER = 'TRANSFER',
  ADMIN = 'ADMIN',
}

export enum ActivationState {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  ADMIN = 'ADMINCREATED',
  PAYED = 'PAYED',
  FAILED = 'FAILED',
}

export enum WebpayState {
  INITIAL = 'INITIAL',
  PENDING = 'PENDING',
  ACTIVE = 'AUTHORIZED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  ERROR = 'ERROR',
  FAILED = 'FAILED',
}

export interface TransferDateData {
  tranferAmount: number;
  originAccount: string;
  destinationAccount: string;
  originBank: string;
  destinationBank: string;
  transationDate: Date;
}

export interface WebpayData {
  id?: string;
  date?: Date;
  state?: WebpayState;
}

export interface PriceData {
  TotalPrice: number;
  TotalDiscount?: number;
  TotalTax: number;
}

export interface QrElement {
  qrCode: string;
  price: number;
  expirationDate: Date;
  duration: string;
  plan?: string;
}

export interface InvoiceData {
  rut: string;
  direccion: string;
  giro: string;
  razonSocial: string;
}

export interface QrActivate {
  id: string;
  methodActivation: MethodActivation;
  activationDate?: Date;
  state: ActivationState;
  TransferDate?: TransferDateData;
  descriptionAdministrator?: string;
  adminId?: string;
  WebpayTransaction?: WebpayData;
  price: PriceData;
  userId: string;
  description?: string;
  qrList: QrElement[];
  documentType: DocumentType;
  invoiceData?: InvoiceData;
  sendDocument?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class QrActivateEntity implements QrActivate {
  id: string;
  methodActivation: MethodActivation;
  activationDate?: Date;
  state: ActivationState;
  TransferDate?: TransferDateData;
  descriptionAdministrator?: string;
  adminId?: string;
  WebpayTransaction?: WebpayData;
  price: PriceData;
  userId: string;
  description?: string;
  qrList: QrElement[];
  documentType: DocumentType;
  invoiceData?: InvoiceData;
  sendDocument?: boolean;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(data: Partial<QrActivate>) {
    this.id = data.id || '';
    this.methodActivation = data.methodActivation || MethodActivation.WEBPAY;
    this.activationDate = data.activationDate;
    this.state = data.state || ActivationState.PENDING;
    this.TransferDate = data.TransferDate;
    this.descriptionAdministrator = data.descriptionAdministrator;
    this.adminId = data.adminId;
    this.WebpayTransaction = data.WebpayTransaction;
    this.price = data.price || { TotalPrice: 0, TotalTax: 0 };
    this.userId = data.userId || '';
    this.description = data.description;
    this.qrList = data.qrList || [];
    this.documentType = data.documentType || DocumentType.BOLETA;
    this.invoiceData = data.invoiceData;
    this.sendDocument = data.sendDocument ?? false;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
