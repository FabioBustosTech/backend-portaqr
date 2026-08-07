/** Doc Mongoose tipado para mappers */
export interface MongoDoc<T> {
  _id?: unknown;
  __v?: number;
  [key: string]: unknown;
}

/** Convierte _id de Mongo a string */
export function toId(value: unknown): string {
  return value ? value.toString() : '';
}
