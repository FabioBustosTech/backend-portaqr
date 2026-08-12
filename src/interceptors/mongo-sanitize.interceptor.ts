/**
 * Interceptor de defensa en profundidad NoSQL (SPEC-008 H6).
 *
 * A diferencia de un middleware Express (`app.use()`), un interceptor global
 * corre DESPUÉS de que el body-parser de NestJS parsea el request y ANTES del
 * ValidationPipe → sanea body/query/params ya disponibles.
 *
 * Usa `sanitize()` de express-mongo-sanitize, que MUTA los objetos in-place:
 * así no reasigna req.query/req.params (getters de solo lectura en Express 5).
 */
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import mongoSanitize = require('express-mongo-sanitize');

@Injectable()
export class MongoSanitizeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === 'http') {
      const req = context.switchToHttp().getRequest<Request>();
      // sanitize() es in-place (delete + reasignación de claves internas):
      // no reasigna la raíz → compatible con los getters de Express 5.
      if (req.body && typeof req.body === 'object') {
        mongoSanitize.sanitize(req.body);
      }
      if (req.query && typeof req.query === 'object') {
        mongoSanitize.sanitize(req.query);
      }
      if (req.params && typeof req.params === 'object') {
        mongoSanitize.sanitize(req.params);
      }
    }
    return next.handle();
  }
}
