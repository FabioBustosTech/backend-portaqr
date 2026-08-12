import { createHash } from 'crypto';

/** SHA-256 hex de un valor — usado para persistir el refresh token sin guardar el token plano. */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
