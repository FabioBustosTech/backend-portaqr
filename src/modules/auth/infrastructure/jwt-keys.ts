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

/**
 * Par RSA efímero usado como fallback cuando no existen los archivos PEM
 * (p. ej. en tests o arranque sin llaves). Se genera una única vez y se
 * reutiliza para que firma y verificación sean consistentes.
 */
let ephemeralPair: JwtKeyPair | null = null;

/**
 * Carga el par de llaves RSA (RS256) desde las rutas configuradas
 * (`JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`). Si los archivos no existen,
 * genera un par efímero en memoria para no romper el arranque.
 */
export function loadJwtKeys(configService: ConfigService): JwtKeyPair {
  const privatePath =
    configService.get<string>('JWT_PRIVATE_KEY') ?? DEFAULT_PRIVATE_KEY_PATH;
  const publicPath =
    configService.get<string>('JWT_PUBLIC_KEY') ?? DEFAULT_PUBLIC_KEY_PATH;

  try {
    return {
      privateKey: readFileSync(resolve(process.cwd(), privatePath), 'utf8'),
      publicKey: readFileSync(resolve(process.cwd(), publicPath), 'utf8'),
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
        `No se pudieron leer las llaves JWT PEM (${privatePath}, ${publicPath}): ` +
          `se usará un par RSA efímero en memoria (solo desarrollo/tests). ` +
          `${(error as Error).message}`,
      );
    }
    return ephemeralPair;
  }
}
