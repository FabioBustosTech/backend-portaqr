import { randomUUID } from 'crypto';
import type { Qr, QrData } from '../entities/qr.entity';

export interface QrSnapshot extends Qr {}

export interface QrCreateProps {
  id?: string;
  idQr: string;
  userId: string;
  expiration?: Date;
  quantityUpdateMonth?: number;
  description?: string;
  data: QrData;
  name?: string;
  active?: boolean;
  isFavorite?: boolean;
  isOldMode?: boolean;
  typeQr: string;
}

export class QrAggregate {
  private readonly _id: string;
  private readonly _idQr: string;
  private readonly _userId: string;
  private readonly _expiration?: Date;
  private readonly _quantityUpdateMonth?: number;
  private readonly _description?: string;
  private readonly _data: QrData;
  private readonly _name?: string;
  private readonly _updatedAt?: Date;
  private readonly _active?: boolean;
  private readonly _isFavorite?: boolean;
  private readonly _isOldMode?: boolean;
  private readonly _typeQr: string;
  private readonly _createdAt?: Date;

  private constructor(props: QrSnapshot) {
    this._id = props.id;
    this._idQr = props.idQr;
    this._userId = props.userId;
    this._expiration = props.expiration;
    this._quantityUpdateMonth = props.quantityUpdateMonth;
    this._description = props.description;
    this._data = props.data;
    this._name = props.name;
    this._updatedAt = props.updatedAt;
    this._active = props.active;
    this._isFavorite = props.isFavorite;
    this._isOldMode = props.isOldMode;
    this._typeQr = props.typeQr;
    this._createdAt = props.createdAt;
  }

  // ---- Factory methods ----

  /** Crea un nuevo QR */
  static crear(props: QrCreateProps): QrAggregate {
    return new QrAggregate({
      id: props.id || randomUUID(),
      idQr: props.idQr,
      userId: props.userId,
      expiration: props.expiration,
      quantityUpdateMonth: props.quantityUpdateMonth,
      description: props.description,
      data: props.data,
      name: props.name,
      active: props.active ?? false,
      isFavorite: props.isFavorite ?? false,
      isOldMode: props.isOldMode ?? false,
      typeQr: props.typeQr,
      createdAt: new Date(),
    });
  }

  /** Restaura un QR existente desde snapshot (persistencia) */
  static cargarExistente(snap: QrSnapshot): QrAggregate {
    return new QrAggregate(snap);
  }

  // ---- Métodos de negocio (inmutables) ----

  /** Actualiza datos del QR, retorna nueva instancia */
  actualizar(data: Partial<Omit<QrSnapshot, 'id'>>): QrAggregate {
    return new QrAggregate({
      id: this._id,
      idQr: data.idQr ?? this._idQr,
      userId: data.userId ?? this._userId,
      expiration: data.expiration ?? this._expiration,
      quantityUpdateMonth: data.quantityUpdateMonth ?? this._quantityUpdateMonth,
      description: data.description ?? this._description,
      data: data.data ?? this._data,
      name: data.name ?? this._name,
      active: data.active ?? this._active,
      isFavorite: data.isFavorite ?? this._isFavorite,
      isOldMode: data.isOldMode ?? this._isOldMode,
      typeQr: data.typeQr ?? this._typeQr,
      createdAt: this._createdAt,
      updatedAt: new Date(),
    });
  }

  /** Activa el QR */
  activar(): QrAggregate {
    return this.actualizar({ active: true });
  }

  /** Desactiva el QR */
  desactivar(): QrAggregate {
    return this.actualizar({ active: false });
  }

  /** Marca el QR como favorito */
  marcarFavorito(): QrAggregate {
    return this.actualizar({ isFavorite: true });
  }

  // ---- Serialización ----

  toSnapshot(): QrSnapshot {
    return {
      id: this._id,
      idQr: this._idQr,
      userId: this._userId,
      expiration: this._expiration,
      quantityUpdateMonth: this._quantityUpdateMonth,
      description: this._description,
      data: this._data,
      name: this._name,
      updatedAt: this._updatedAt,
      active: this._active,
      isFavorite: this._isFavorite,
      isOldMode: this._isOldMode,
      typeQr: this._typeQr,
      createdAt: this._createdAt,
    };
  }

  toEntity(): Qr {
    return this.toSnapshot();
  }

  // ---- Getters ----

  get id(): string {
    return this._id;
  }
  get idQr(): string {
    return this._idQr;
  }
  get userId(): string {
    return this._userId;
  }
  get expiration(): Date | undefined {
    return this._expiration;
  }
  get quantityUpdateMonth(): number | undefined {
    return this._quantityUpdateMonth;
  }
  get description(): string | undefined {
    return this._description;
  }
  get data(): QrData {
    return this._data;
  }
  get name(): string | undefined {
    return this._name;
  }
  get active(): boolean | undefined {
    return this._active;
  }
  get isFavorite(): boolean | undefined {
    return this._isFavorite;
  }
  get isOldMode(): boolean | undefined {
    return this._isOldMode;
  }
  get typeQr(): string {
    return this._typeQr;
  }
  get createdAt(): Date | undefined {
    return this._createdAt;
  }
  get updatedAt(): Date | undefined {
    return this._updatedAt;
  }
}
