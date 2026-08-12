import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { CustomLogger } from '../shared/utils/logger.util';

@Injectable()
export class ResponseLoggerInterceptor implements NestInterceptor {
  private logger = new CustomLogger('ResponseLoggerInterceptor');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const { originalUrl } = req;
    const trackingId = req.headers['x-tracking-id'] as string;

    // Capturamos el cuerpo de la respuesta interceptando `res.send`
    let responseBody: any = null;
    const originalSend = res.send;
    // SPEC-008-B: rest params en vez de `arguments` (prefer-rest-params)
    res.send = function (...args: any[]): Response {
      responseBody = args[0];
      return originalSend.apply(this, args);
    };

    // El evento 'finish' se dispara cuando la respuesta se ha completado
    res.on('finish', () => {
      let bodyToLog: any;

      if (responseBody && typeof responseBody === 'string') {
        try {
          // Es un string JSON, lo parseamos para un log legible
          bodyToLog = JSON.parse(responseBody);
        } catch (e) {
          // No es un string JSON, lo logueamos como texto plano
          bodyToLog = responseBody;
        }
      } else if (Buffer.isBuffer(responseBody)) {
        bodyToLog = 'Binary data (Buffer)';
      } else {
        // Ya es un objeto u otro tipo
        bodyToLog = responseBody;
      }

      const logData = {
        path: originalUrl,
        status: res.statusCode,
        headers: res.getHeaders(),
        body: bodyToLog,
      };

      this.logger.log(
        JSON.stringify(logData, null, 2),
        'ResponseLogger',
        'ResponseLogger',
        trackingId,
      );
    });

    return next.handle();
  }
}