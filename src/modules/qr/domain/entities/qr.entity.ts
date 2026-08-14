/** Entidad de dominio pura de un QR (sin dependencias de NestJS/Mongo) */

export interface QrWifiData {
  ssid: string;
  security: string;
  password: string;
}

export interface QrUrlListItem {
  itemId?: string;            // SPEC-005 RF-12: identificador único del item dentro del array
  vcard?: unknown;
  url?: string;
  documentUrl?: string | null; // SPEC-005 RF-2: URL pública R2 del PDF (solo typeUrl === 'pdf')
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

// SPEC-015: datos del usuario dueño resueltos por $lookup (solo vista admin — nunca público)
export interface QrOwnerInfo {
  firstName?: string;
  paternalLastName?: string;
  maternalLastName?: string;
  userName?: string;
  email?: string;
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
  // SPEC-014: trazabilidad de desactivación admin (solo panel — nunca público)
  deactivatedAt?: Date;
  deactivatedBy?: string;
  deactivationReason?: string;
  // SPEC-015: usuario dueño resuelto (admin-only, null si el usuario no existe)
  user?: QrOwnerInfo | null;
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
  deactivatedAt?: Date;
  deactivatedBy?: string;
  deactivationReason?: string;
  user?: QrOwnerInfo | null;

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
    this.deactivatedAt = data.deactivatedAt;
    this.deactivatedBy = data.deactivatedBy;
    this.deactivationReason = data.deactivationReason;
    this.user = data.user ?? null;
  }
}
