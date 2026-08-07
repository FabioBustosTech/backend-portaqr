import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Adaptador de contrato legacy:
 * El monolito hexagonal devuelve `id` en las entidades, pero el frontend
 * (qr-app) aún consume `_id` en varias páginas. Este interceptor agrega
 * `_id` como alias de `id` en las respuestas JSON de forma recursiva.
 *
 * NOTA: cuando el frontend migre completamente a `id`, este interceptor
 * puede eliminarse.
 */
@Injectable()
export class LegacyIdAliasInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => this.addIdAlias(data)));
  }

  private addIdAlias(value: unknown, depth = 0): unknown {
    if (depth > 10 || value === null || value === undefined) {
      return value;
    }

    // No procesar Date, Buffer ni otros objetos especiales
    if (value instanceof Date || value instanceof Buffer || typeof value !== 'object') {
      return value;
    }

    // Arrays: mapear cada elemento
    if (Array.isArray(value)) {
      return value.map((item) => this.addIdAlias(item, depth + 1));
    }

    // Objetos planos
    const obj = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(obj)) {
      if (key === 'id' && typeof val === 'string' && obj._id === undefined) {
        result.id = val;
        result._id = val;
      } else {
        result[key] = this.addIdAlias(val, depth + 1);
      }
    }
    return result;
  }
}
