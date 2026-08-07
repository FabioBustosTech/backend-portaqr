/**
 * Genera el par de llaves RSA (RS256) y las imprime en formato de UNA LÍNEA
 * listo para pegar en el `.env`:
 *
 *   JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----"
 *   JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIj...\n-----END PUBLIC KEY-----"
 *
 * Uso:
 *   node scripts/generate-jwt-env.js          # genera NUEVAS llaves (rotación)
 *   node scripts/generate-jwt-env.js --use-existing   # usa keys/*.pem existentes
 *
 * Con --use-existing, si los archivos no existen se genera el par nuevo
 * (y se guarda en keys/ para el formato local/legacy).
 *
 * NOTA: al rotar, recordá actualizar también JWT_PUBLIC_KEY en el .env del
 * frontend (qr-app) y reiniciar ambos servicios.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KEYS_DIR = path.join(process.cwd(), 'keys');
const PRIVATE_PATH = path.join(KEYS_DIR, 'jwt-private.pem');
const PUBLIC_PATH = path.join(KEYS_DIR, 'jwt-public.pem');

const USE_EXISTING = process.argv.includes('--use-existing');

/** Convierte un PEM multi-línea a una sola línea con \n literales. */
function toSingleLine(pem) {
  return pem.trim().replace(/\r?\n/g, '\\n');
}

/** Genera un par RSA nuevo y lo guarda en keys/. */
function generatePair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  fs.mkdirSync(KEYS_DIR, { recursive: true });
  fs.writeFileSync(PRIVATE_PATH, privateKey);
  fs.writeFileSync(PUBLIC_PATH, publicKey);

  return { privateKey: privateKey.toString(), publicKey: publicKey.toString() };
}

function main() {
  let privateKey;
  let publicKey;

  if (USE_EXISTING && fs.existsSync(PRIVATE_PATH) && fs.existsSync(PUBLIC_PATH)) {
    privateKey = fs.readFileSync(PRIVATE_PATH, 'utf8');
    publicKey = fs.readFileSync(PUBLIC_PATH, 'utf8');
    console.log('# Usando llaves existentes de keys/');
  } else {
    const pair = generatePair();
    privateKey = pair.privateKey;
    publicKey = pair.publicKey;
    console.log('# Nuevo par generado y guardado en keys/');
    console.log('# ⚠️  Esto invalida todos los tokens emitidos (login requerido de nuevo).');
  }

  console.log('');
  console.log('# Copia estas dos líneas en tu .env (reemplazan las actuales):');
  console.log('JWT_PRIVATE_KEY="' + toSingleLine(privateKey) + '"');
  console.log('JWT_PUBLIC_KEY="' + toSingleLine(publicKey) + '"');
  console.log('');
  console.log('# ⚠️  Si rotaste las llaves, actualiza también JWT_PUBLIC_KEY en');
  console.log('#    el .env del frontend (qr-app) y reinicia ambos servicios.');
}

main();
