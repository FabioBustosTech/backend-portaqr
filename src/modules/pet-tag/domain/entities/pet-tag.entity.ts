/** Entidad de dominio pura de una PetTag (placa de mascota) */

export interface PetData {
  ownerName: string;
  address: string;
  phone: string;
  petName: string;
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
  /** SPEC-016: URL pública de la foto de la mascota (Cloudflare R2) */
  petImageUrl?: string | null;
}

export interface PetTag {
  id?: string;
  name?: string;
  idQr: string;
  userId: string | null;
  activationPin: string;
  status: string;
  petData: PetData | null;
  expiration: Date | null;
  commercialStatus: string;
  isFavorite: boolean;
  assignedStoreName: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class PetTagEntity implements PetTag {
  id?: string;
  name?: string;
  idQr: string;
  userId: string | null;
  activationPin: string;
  status: string;
  petData: PetData | null;
  expiration: Date | null;
  commercialStatus: string;
  isFavorite: boolean;
  assignedStoreName: string | null;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(data: Partial<PetTag>) {
    this.id = data.id;
    this.name = data.name;
    this.idQr = data.idQr || '';
    this.userId = data.userId ?? null;
    this.activationPin = data.activationPin || '';
    this.status = data.status || 'RESERVADO';
    this.petData = data.petData ?? null;
    this.expiration = data.expiration ?? null;
    this.commercialStatus = data.commercialStatus || 'EN_CREACION';
    this.isFavorite = data.isFavorite ?? false;
    this.assignedStoreName = data.assignedStoreName ?? null;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
