import { randomUUID } from 'crypto';
import type { User } from '../entities/user.entity';

export interface UserSnapshot {
  id: string;
  email: string;
  userName: string;
  password?: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  role: string;
  isEmailVerified: boolean;
  phone?: string;
  lastLogin?: Date;
  verificationCode?: string;
  verificationCodeExpires?: Date;
  passwordResetCode?: string;
  passwordResetExpires?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserCreateProps {
  id?: string;
  email: string;
  userName: string;
  password?: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  role?: string;
  isEmailVerified?: boolean;
  phone?: string;
  lastLogin?: Date;
  verificationCode?: string;
  verificationCodeExpires?: Date;
  passwordResetCode?: string;
  passwordResetExpires?: Date;
}

export class UserAggregate {
  private readonly _id: string;
  private readonly _email: string;
  private readonly _userName: string;
  private readonly _password?: string;
  private readonly _firstName: string;
  private readonly _paternalLastName: string;
  private readonly _maternalLastName: string;
  private readonly _role: string;
  private readonly _isEmailVerified: boolean;
  private readonly _phone?: string;
  private readonly _lastLogin?: Date;
  private readonly _verificationCode?: string;
  private readonly _verificationCodeExpires?: Date;
  private readonly _passwordResetCode?: string;
  private readonly _passwordResetExpires?: Date;
  private readonly _createdAt?: Date;
  private readonly _updatedAt?: Date;

  private constructor(props: UserSnapshot) {
    this._id = props.id;
    this._email = props.email;
    this._userName = props.userName;
    this._password = props.password;
    this._firstName = props.firstName;
    this._paternalLastName = props.paternalLastName;
    this._maternalLastName = props.maternalLastName;
    this._role = props.role;
    this._isEmailVerified = props.isEmailVerified;
    this._phone = props.phone;
    this._lastLogin = props.lastLogin;
    this._verificationCode = props.verificationCode;
    this._verificationCodeExpires = props.verificationCodeExpires;
    this._passwordResetCode = props.passwordResetCode;
    this._passwordResetExpires = props.passwordResetExpires;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  // ---- Factory methods ----

  /** Crea un nuevo usuario */
  static crear(props: UserCreateProps): UserAggregate {
    return new UserAggregate({
      id: props.id || randomUUID(),
      email: props.email,
      userName: props.userName,
      password: props.password,
      firstName: props.firstName,
      paternalLastName: props.paternalLastName,
      maternalLastName: props.maternalLastName,
      role: props.role ?? 'user',
      isEmailVerified: props.isEmailVerified ?? false,
      phone: props.phone,
      lastLogin: props.lastLogin,
      verificationCode: props.verificationCode,
      verificationCodeExpires: props.verificationCodeExpires,
      passwordResetCode: props.passwordResetCode,
      passwordResetExpires: props.passwordResetExpires,
      createdAt: new Date(),
    });
  }

  /** Restaura un usuario existente desde snapshot (persistencia) */
  static cargarExistente(snap: UserSnapshot): UserAggregate {
    return new UserAggregate(snap);
  }

  // ---- Métodos de negocio (inmutables) ----

  /** Actualiza datos del usuario, retorna nueva instancia */
  actualizar(
    data: Partial<Omit<UserSnapshot, 'id'>>,
  ): UserAggregate {
    return new UserAggregate({
      id: this._id,
      email: data.email ?? this._email,
      userName: data.userName ?? this._userName,
      password: data.password ?? this._password,
      firstName: data.firstName ?? this._firstName,
      paternalLastName: data.paternalLastName ?? this._paternalLastName,
      maternalLastName: data.maternalLastName ?? this._maternalLastName,
      role: data.role ?? this._role,
      isEmailVerified: data.isEmailVerified ?? this._isEmailVerified,
      phone: data.phone ?? this._phone,
      lastLogin: data.lastLogin ?? this._lastLogin,
      verificationCode: data.verificationCode ?? this._verificationCode,
      verificationCodeExpires:
        data.verificationCodeExpires ?? this._verificationCodeExpires,
      passwordResetCode: data.passwordResetCode ?? this._passwordResetCode,
      passwordResetExpires:
        data.passwordResetExpires ?? this._passwordResetExpires,
      createdAt: this._createdAt,
      updatedAt: new Date(),
    });
  }

  /** Marca el email como verificado */
  verificarEmail(): UserAggregate {
    return this.actualizar({
      isEmailVerified: true,
      verificationCode: undefined,
      verificationCodeExpires: undefined,
    });
  }

  /** Asigna un código de verificación con expiración */
  asignarCodigoVerificacion(code: string, expires: Date): UserAggregate {
    return this.actualizar({ verificationCode: code, verificationCodeExpires: expires });
  }

  /** Asigna un código de reset de contraseña con expiración */
  asignarCodigoReset(code: string, expires: Date): UserAggregate {
    return this.actualizar({ passwordResetCode: code, passwordResetExpires: expires });
  }

  /** Cambia la contraseña y limpia códigos de reset */
  cambiarPassword(passwordHash: string): UserAggregate {
    return this.actualizar({
      password: passwordHash,
      passwordResetCode: undefined,
      passwordResetExpires: undefined,
    });
  }

  /** Registra el último login */
  registrarLogin(): UserAggregate {
    return this.actualizar({ lastLogin: new Date() });
  }

  // ---- Serialización ----

  toSnapshot(): UserSnapshot {
    return {
      id: this._id,
      email: this._email,
      userName: this._userName,
      password: this._password,
      firstName: this._firstName,
      paternalLastName: this._paternalLastName,
      maternalLastName: this._maternalLastName,
      role: this._role,
      isEmailVerified: this._isEmailVerified,
      phone: this._phone,
      lastLogin: this._lastLogin,
      verificationCode: this._verificationCode,
      verificationCodeExpires: this._verificationCodeExpires,
      passwordResetCode: this._passwordResetCode,
      passwordResetExpires: this._passwordResetExpires,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  toEntity(): User {
    return this.toSnapshot();
  }

  // ---- Getters ----

  get id(): string {
    return this._id;
  }
  get email(): string {
    return this._email;
  }
  get userName(): string {
    return this._userName;
  }
  get password(): string | undefined {
    return this._password;
  }
  get firstName(): string {
    return this._firstName;
  }
  get paternalLastName(): string {
    return this._paternalLastName;
  }
  get maternalLastName(): string {
    return this._maternalLastName;
  }
  get role(): string {
    return this._role;
  }
  get isEmailVerified(): boolean {
    return this._isEmailVerified;
  }
  get phone(): string | undefined {
    return this._phone;
  }
  get lastLogin(): Date | undefined {
    return this._lastLogin;
  }
  get verificationCode(): string | undefined {
    return this._verificationCode;
  }
  get verificationCodeExpires(): Date | undefined {
    return this._verificationCodeExpires;
  }
  get passwordResetCode(): string | undefined {
    return this._passwordResetCode;
  }
  get passwordResetExpires(): Date | undefined {
    return this._passwordResetExpires;
  }
  get createdAt(): Date | undefined {
    return this._createdAt;
  }
  get updatedAt(): Date | undefined {
    return this._updatedAt;
  }
}
