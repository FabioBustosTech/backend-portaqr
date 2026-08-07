import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { generateKeyPairSync } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export interface JwtKeyPair {
  privateKey: string;
  publicKey: string;
}

const DEFAULT_PRIVATE_KEY_PATH = 'keys/jwt-private.pem';
const DEFAULT_PUBLIC_KEY_PATH = 'keys/jwt-public.pem';

/** Prefijo de un PEM: si la variable contiene esto, es el contenido directo. */
const PEM_HEADER = '-----BEGIN';

/**
 * Par RSA efímero usado como fallback cuando no hay llaves configuradas
 * (p. ej. en tests o arranque sin llaves). Se genera una única vez y se
 * reutiliza para que firma y verificación sean consistentes.
 */
let ephemeralPair: JwtKeyPair | null = null;

/**
 * Normaliza un PEM que puede venir del .env con `\n` literales o con saltos
 * reales (multi-línea).
 */
function normalizePem(value: string): string {
  return value.replace(/\\n/g, '\n');
}

/**
 * Carga el par de llaves RSA (RS256) desde las variables de entorno:
 *
 * `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` aceptan DOS formatos:
 *   1. Contenido PEM directo (empieza con `-----BEGIN`), con `\n` literales
 *      o saltos reales — recomendado para Railway/despliegues.
 *   2. Ruta relativa a un archivo PEM (p. ej. `keys/jwt-private.pem`) —
 *      formato legacy/local.
 *
 * Si no hay llaves válidas, genera un par efímero en memoria (solo dev/tests).
 */
export function loadJwtKeys(configService: ConfigService): JwtKeyPair {
  const privateValue = configService.get<string>('JWT_PRIVATE_KEY');
  const publicValue = configService.get<string>('JWT_PUBLIC_KEY');

  const readKey = (value: string | undefined, fallbackPath: string): string => {
    // Formato 1: contenido PEM directo en la variable
    if (value && value.includes(PEM_HEADER)) {
      return normalizePem(value);
    }
    // Formato 2: ruta a archivo (legacy)
    const filePath = value ?? fallbackPath;
    return readFileSync(resolve(process.cwd(), filePath), 'utf8');
  };

  try {
    return {
      privateKey: readKey(privateValue, DEFAULT_PRIVATE_KEY_PATH),
      publicKey: readKey(publicValue, DEFAULT_PUBLIC_KEY_PATH),
    };
  } catch (error) {
    if (!ephemeralPair) {
      const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
      });
      ephemeralPair = {
        privateKey: privateKey
          .export({ type: 'pkcs8', format: 'pem' })
          .toString(),
        publicKey: publicKey
          .export({ type: 'spki', format: 'pem' })
          .toString(),
      };
      new Logger('JwtKeys').warn(
        `No se pudieron leer las llaves JWT (JWT_PRIVATE_KEY/JWT_PUBLIC_KEY): ` +
          `se usará un par RSA efímero en memoria (solo desarrollo/tests). ` +
          `${(error as Error).message}`,
      );
    }
    return ephemeralPair;
  }
}
