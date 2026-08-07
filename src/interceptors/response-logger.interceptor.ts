import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
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
    res.send = function (body: any): Response {
      responseBody = body;
      return originalSend.apply(this, arguments);
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