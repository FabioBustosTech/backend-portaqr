/** Entidad de dominio del refresh token persistido (SPEC-009 A8). */
export interface RefreshToken {
  id?: string;
  userId: string;
  /** SHA-256 del refresh token JWT — nunca se guarda el token plano */
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt?: Date;
}
