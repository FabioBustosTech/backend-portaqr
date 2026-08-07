/** Entidad de dominio pura de una generación de QR gratuito */

export interface QrFreeGenerationInformation {
  typeQr: string;
  data: string;
}

export interface QrFreeGenerationLocation {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  country?: string;
  city?: string;
}

export interface QrFreeGenerationDevice {
  platform?: string;
  browser?: string;
  isMobile?: boolean;
}

export interface QrFreeGeneration {
  id?: string;
  email: string;
  information: QrFreeGenerationInformation;
  location?: QrFreeGenerationLocation;
  device?: QrFreeGenerationDevice;
  createdAt?: Date;
}

export interface PaginatedQrFreeGenerations {
  items: QrFreeGeneration[];
  total: number;
}

export class QrFreeGenerationEntity implements QrFreeGeneration {
  id?: string;
  email: string;
  information: QrFreeGenerationInformation;
  location?: QrFreeGenerationLocation;
  device?: QrFreeGenerationDevice;
  createdAt?: Date;

  constructor(data: Partial<QrFreeGeneration>) {
    this.id = data.id;
    this.email = data.email || '';
    this.information = data.information || { typeQr: '', data: '' };
    this.location = data.location;
    this.device = data.device;
    this.createdAt = data.createdAt;
  }
}
