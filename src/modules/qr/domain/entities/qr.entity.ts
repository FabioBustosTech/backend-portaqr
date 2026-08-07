/** Entidad de dominio pura de un QR (sin dependencias de NestJS/Mongo) */

export interface QrWifiData {
  ssid: string;
  security: string;
  password: string;
}

export interface QrUrlListItem {
  vcard?: unknown;
  url?: string;
  typeUrl: string;
}

export interface QrVCardData {
  fn?: string;
  n?: {
    lastName?: string;
    firstName?: string;
    additional?: string;
    prefix?: string;
    suffix?: string;
  };
  nickname?: string;
  gender?: string;
  bday?: string;
  anniversary?: string;
  org?: string;
  title?: string;
  role?: string;
  emails?: Array<{
    type?: string;
    value: string;
    pref?: number;
  }>;
  phones?: Array<{
    type?: string;
    value: string;
    pref?: number;
  }>;
  addresses?: Array<{
    type?: string;
    street?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
    label?: string;
  }>;
  urls?: string[];
  photo?: string;
  logo?: string;
  note?: string;
  uid?: string;
  rev?: string;
}

export interface QrPetData {
  ownerName?: string;
  address?: string;
  phone?: string;
  petName?: string;
  birthDate?: string;
  breed?: string;
  gender?: string;
  species?: string;
  dietFrequency?: string;
  diseases?: string;
  vaccines?: Array<{
    name?: string;
    date?: string;
  }>;
  observations?: string;
}

export interface QrData {
  url?: string;
  whatsappUrl?: string;
  emailUrl?: string;
  phoneUrl?: string;
  wifiData?: QrWifiData;
  text?: string;
  urlList?: QrUrlListItem[];
  vcardData?: QrVCardData;
  petData?: QrPetData;
  mapUrl?: string;
  listImageUrl?: string | null; // SPEC-002: URL pública de portada (solo typeQr === 'list')
  typeQr: string;
}

export interface Qr {
  id: string;
  idQr: string;
  userId: string;
  expiration?: Date;
  quantityUpdateMonth?: number;
  description?: string;
  data: QrData;
  name?: string;
  updatedAt?: Date;
  active?: boolean;
  isFavorite?: boolean;
  isOldMode?: boolean;
  typeQr: string;
  createdAt?: Date;
}

export class QrEntity implements Qr {
  id: string;
  idQr: string;
  userId: string;
  expiration?: Date;
  quantityUpdateMonth?: number;
  description?: string;
  data: QrData;
  name?: string;
  updatedAt?: Date;
  active?: boolean;
  isFavorite?: boolean;
  isOldMode?: boolean;
  typeQr: string;
  createdAt?: Date;

  constructor(data: Partial<Qr>) {
    this.id = data.id || '';
    this.idQr = data.idQr || '';
    this.userId = data.userId || '';
    this.expiration = data.expiration;
    this.quantityUpdateMonth = data.quantityUpdateMonth;
    this.description = data.description;
    this.data = data.data || { typeQr: '' };
    this.name = data.name;
    this.updatedAt = data.updatedAt;
    this.active = data.active ?? false;
    this.isFavorite = data.isFavorite ?? false;
    this.isOldMode = data.isOldMode ?? false;
    this.typeQr = data.typeQr || '';
    this.createdAt = data.createdAt;
  }
}
