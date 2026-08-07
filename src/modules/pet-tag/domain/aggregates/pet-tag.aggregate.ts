import { randomUUID } from 'crypto';
import type { PetData, PetTag } from '../entities/pet-tag.entity';

export interface PetTagSnapshot {
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

export interface PetTagCreateProps {
  id?: string;
  name?: string;
  idQr: string;
  userId?: string | null;
  activationPin: string;
  status?: string;
  petData?: PetData | null;
  expiration?: Date | null;
  commercialStatus?: string;
  isFavorite?: boolean;
  assignedStoreName?: string | null;
}

export class PetTagAggregate {
  private readonly _id?: string;
  private readonly _name?: string;
  private readonly _idQr: string;
  private readonly _userId: string | null;
  private readonly _activationPin: string;
  private readonly _status: string;
  private readonly _petData: PetData | null;
  private readonly _expiration: Date | null;
  private readonly _commercialStatus: string;
  private readonly _isFavorite: boolean;
  private readonly _assignedStoreName: string | null;
  private readonly _createdAt?: Date;
  private readonly _updatedAt?: Date;

  private constructor(props: PetTagSnapshot) {
    this._id = props.id;
    this._name = props.name;
    this._idQr = props.idQr;
    this._userId = props.userId;
    this._activationPin = props.activationPin;
    this._status = props.status;
    this._petData = props.petData;
    this._expiration = props.expiration;
    this._commercialStatus = props.commercialStatus;
    this._isFavorite = props.isFavorite;
    this._assignedStoreName = props.assignedStoreName;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  // ---- Factory methods ----

  /** Crea una nueva PetTag */
  static crear(props: PetTagCreateProps): PetTagAggregate {
    return new PetTagAggregate({
      id: props.id || randomUUID(),
      name: props.name,
      idQr: props.idQr,
      userId: props.userId ?? null,
      activationPin: props.activationPin,
      status: props.status ?? 'RESERVADO',
      petData: props.petData ?? null,
      expiration: props.expiration ?? null,
      commercialStatus: props.commercialStatus ?? 'EN_CREACION',
      isFavorite: props.isFavorite ?? false,
      assignedStoreName: props.assignedStoreName ?? null,
      createdAt: new Date(),
    });
  }

  /** Restaura una PetTag existente desde snapshot (persistencia) */
  static cargarExistente(snap: PetTagSnapshot): PetTagAggregate {
    return new PetTagAggregate(snap);
  }

  // ---- Métodos de negocio (inmutables) ----

  /** Actualiza los datos de la placa, retorna nueva instancia */
  actualizar(data: Partial<PetTag>): PetTagAggregate {
    return new PetTagAggregate({
      id: this._id,
      name: data.name ?? this._name,
      idQr: this._idQr,
      userId: data.userId ?? this._userId,
      activationPin: this._activationPin,
      status: data.status ?? this._status,
      petData: data.petData ?? this._petData,
      expiration: data.expiration ?? this._expiration,
      commercialStatus: data.commercialStatus ?? this._commercialStatus,
      isFavorite: data.isFavorite ?? this._isFavorite,
      assignedStoreName: data.assignedStoreName ?? this._assignedStoreName,
      createdAt: this._createdAt,
      updatedAt: new Date(),
    });
  }

  /** Activa la placa asignándola a un usuario con expiración de 1 año */
  activar(userId: string, petData: PetData, expiration: Date): PetTagAggregate {
    return new PetTagAggregate({
      ...this.toSnapshot(),
      status: 'ACTIVO',
      userId,
      petData,
      expiration,
      commercialStatus: 'VENDIDO',
      updatedAt: new Date(),
    });
  }

  // ---- Serialización ----

  toSnapshot(): PetTagSnapshot {
    return {
      id: this._id,
      name: this._name,
      idQr: this._idQr,
      userId: this._userId,
      activationPin: this._activationPin,
      status: this._status,
      petData: this._petData,
      expiration: this._expiration,
      commercialStatus: this._commercialStatus,
      isFavorite: this._isFavorite,
      assignedStoreName: this._assignedStoreName,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  toEntity(): PetTag {
    return this.toSnapshot();
  }

  // ---- Getters ----

  get id(): string | undefined {
    return this._id;
  }
  get name(): string | undefined {
    return this._name;
  }
  get idQr(): string {
    return this._idQr;
  }
  get userId(): string | null {
    return this._userId;
  }
  get activationPin(): string {
    return this._activationPin;
  }
  get status(): string {
    return this._status;
  }
  get petData(): PetData | null {
    return this._petData;
  }
  get expiration(): Date | null {
    return this._expiration;
  }
  get commercialStatus(): string {
    return this._commercialStatus;
  }
  get isFavorite(): boolean {
    return this._isFavorite;
  }
  get assignedStoreName(): string | null {
    return this._assignedStoreName;
  }
  get createdAt(): Date | undefined {
    return this._createdAt;
  }
  get updatedAt(): Date | undefined {
    return this._updatedAt;
  }
}
