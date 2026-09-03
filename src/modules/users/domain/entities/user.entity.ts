/** Entidad de dominio pura del Usuario (sin dependencias de NestJS/Mongo) */
export interface User {
  id: string;
  email: string;
  userName: string;
  password?: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  role: string;
  isEmailVerified: boolean;
  /** Versión del token JWT; se incrementa al cerrar sesión para invalidar tokens emitidos */
  tokenVersion?: number;
  phone?: string;
  lastLogin?: Date;
  verificationCode?: string;
  verificationCodeExpires?: Date;
  /** SPEC-009 A5: intentos fallidos de verify-email (tras 5 → se invalida el código) */
  verificationAttempts?: number;
  passwordResetCode?: string;
  passwordResetExpires?: Date;
  /** SPEC-009 A5: intentos fallidos de reset-password (tras 5 → se invalida el código) */
  passwordResetAttempts?: number;
  /** SPEC-020 RF-27: true si el correo de bienvenida ya fue enviado (primer login verificado) */
  welcomeEmailSent?: boolean;
  /** SPEC-020 RF-9: id del usuario en Google (unique sparse — solo cuentas Google) */
  googleId?: string;
  /** SPEC-020 RF-9: proveedor de autenticación ('local' | 'google') */
  provider?: 'local' | 'google';
  /** SPEC-020: false solo para cuentas Google sin contraseña asignada (ADR-020.7) */
  hasPassword?: boolean;
  /** SPEC-020 RF-9: URL del avatar (Google) */
  avatarUrl?: string;
  /** SPEC-030 RF-8: intent de newsletter (copia local; fuente de verdad: qr-cms) */
  newsletterOptIn?: boolean;
  /** SPEC-030 RF-8: última sincronización exitosa al CMS (null = pendiente/reintentar) */
  newsletterSyncedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class UserEntity implements User {
  id: string;
  email: string;
  userName: string;
  password?: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  role: string;
  isEmailVerified: boolean;
  tokenVersion?: number;
  phone?: string;
  lastLogin?: Date;
  verificationCode?: string;
  verificationCodeExpires?: Date;
  verificationAttempts?: number;
  passwordResetCode?: string;
  passwordResetExpires?: Date;
  passwordResetAttempts?: number;
  welcomeEmailSent?: boolean;
  googleId?: string;
  provider?: 'local' | 'google';
  hasPassword?: boolean;
  avatarUrl?: string;
  newsletterOptIn?: boolean;
  newsletterSyncedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(data: Partial<User>) {
    this.id = data.id || '';
    this.email = data.email || '';
    this.userName = data.userName || '';
    this.password = data.password;
    this.firstName = data.firstName || '';
    this.paternalLastName = data.paternalLastName || '';
    this.maternalLastName = data.maternalLastName || '';
    this.role = data.role || 'user';
    this.isEmailVerified = data.isEmailVerified ?? false;
    this.tokenVersion = data.tokenVersion ?? 0;
    this.phone = data.phone;
    this.lastLogin = data.lastLogin;
    this.verificationCode = data.verificationCode;
    this.verificationCodeExpires = data.verificationCodeExpires;
    this.verificationAttempts = data.verificationAttempts ?? 0;
    this.passwordResetCode = data.passwordResetCode;
    this.passwordResetExpires = data.passwordResetExpires;
    this.passwordResetAttempts = data.passwordResetAttempts ?? 0;
    this.welcomeEmailSent = data.welcomeEmailSent ?? false;
    this.googleId = data.googleId;
    this.provider = data.provider;
    this.hasPassword = data.hasPassword ?? true;
    this.avatarUrl = data.avatarUrl;
    this.newsletterOptIn = data.newsletterOptIn ?? false;
    this.newsletterSyncedAt = data.newsletterSyncedAt;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /** Actualiza los campos del usuario (solo los definidos) */
  actualizar(data: Partial<Omit<User, 'id'>>): void {
    if (data.email !== undefined) this.email = data.email;
    if (data.userName !== undefined) this.userName = data.userName;
    if (data.password !== undefined) this.password = data.password;
    if (data.firstName !== undefined) this.firstName = data.firstName;
    if (data.paternalLastName !== undefined)
      this.paternalLastName = data.paternalLastName;
    if (data.maternalLastName !== undefined)
      this.maternalLastName = data.maternalLastName;
    if (data.role !== undefined) this.role = data.role;
    if (data.isEmailVerified !== undefined)
      this.isEmailVerified = data.isEmailVerified;
    if (data.tokenVersion !== undefined) this.tokenVersion = data.tokenVersion;
    if (data.phone !== undefined) this.phone = data.phone;
    if (data.lastLogin !== undefined) this.lastLogin = data.lastLogin;
    if (data.verificationCode !== undefined)
      this.verificationCode = data.verificationCode;
    if (data.verificationCodeExpires !== undefined)
      this.verificationCodeExpires = data.verificationCodeExpires;
    if (data.passwordResetCode !== undefined)
      this.passwordResetCode = data.passwordResetCode;
    if (data.passwordResetExpires !== undefined)
      this.passwordResetExpires = data.passwordResetExpires;
    this.updatedAt = new Date();
  }
}
