export class JwtKeyNoConfiguradaError extends Error {
  constructor(keyName: string) {
    super(`La variable de entorno ${keyName} no está configurada`);
    this.name = 'JwtKeyNoConfiguradaError';
  }
}
