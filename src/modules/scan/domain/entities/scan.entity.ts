/** Entidad de dominio pura de un Scan (escaneo de QR) */

export interface ScanLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  country?: string;
  city?: string;
}

export interface ScanDevice {
  platform: string;
  browser: string;
  isMobile: boolean;
  os?: string;
  model?: string;
}

export interface Scan {
  id?: string;
  idQr: string;
  scanDate?: Date;
  location?: ScanLocation;
  origen?: string;
  device?: ScanDevice;
  successful: boolean;
  errorMessage?: string;
  userIdScan?: string;
  lastScanId?: string;
  userId: string;
  ip?: string;
  referer?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ScanEntity implements Scan {
  id?: string;
  idQr: string;
  scanDate?: Date;
  location?: ScanLocation;
  origen?: string;
  device?: ScanDevice;
  successful: boolean;
  errorMessage?: string;
  userIdScan?: string;
  lastScanId?: string;
  userId: string;
  ip?: string;
  referer?: string;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(data: Partial<Scan>) {
    this.id = data.id;
    this.idQr = data.idQr || '';
    this.scanDate = data.scanDate;
    this.location = data.location;
    this.origen = data.origen ?? 'desconocido';
    this.device = data.device;
    this.successful = data.successful ?? true;
    this.errorMessage = data.errorMessage;
    this.userIdScan = data.userIdScan;
    this.lastScanId = data.lastScanId;
    this.userId = data.userId || '';
    this.ip = data.ip;
    this.referer = data.referer;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
