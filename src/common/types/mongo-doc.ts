/** Doc Mongoose tipado para mappers */
// SPEC-008-B: el generic <T> nunca se usaba (no hay callers con tipo) → se quita
export interface MongoDoc {
  _id?: unknown;
  __v?: number;
  [key: string]: unknown;
}

/** Convierte _id de Mongo a string */
export function toId(value: unknown): string {
  return value ? value.toString() : '';
}
