import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ResponseLoggerInterceptor } from './interceptors/response-logger.interceptor';
import { LegacyIdAliasInterceptor } from './interceptors/legacy-id-alias.interceptor';
import { createAppValidationPipe } from './common/config/validation-pipe.config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'], // Habilitamos todos los niveles de log
  });

  // SPEC-008 H2 (R3): ValidationPipe con whitelist + forbidNonWhitelisted + transform
  // - whitelist: elimina propiedades no declaradas en DTOs (mass-assignment)
  // - forbidNonWhitelisted: 400 si llega un campo desconocido (detección temprana)
  // - transform + enableImplicitConversion: false → los @Type(() => Number/Date)
  //   corren explícitamente; page/limit llegan tipados sin coerción implícita
  app.useGlobalPipes(createAppValidationPipe());
  app.useGlobalInterceptors(new ResponseLoggerInterceptor());
  app.useGlobalInterceptors(new LegacyIdAliasInterceptor());

  // Habilitar CORS para todos los orígenes
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Accept,Authorization'
  });

  const port = process.env.SERVER_PORT || 3001;
  const server = await app.listen(port);
  logger.log(`🚀 Aplicación corriendo en: http://localhost:${port}`);

  // Manejo de señales de cierre
  const signals = ['SIGINT', 'SIGTERM'];
  signals.forEach(signal => {
    process.on(signal, () => {
      logger.log(`Recibiendo señal ${signal}, cerrando servidor...`);
      server.close(() => {
        logger.log('Servidor cerrado correctamente');
        process.exit(0);
      });
    });
  });

  // Manejo de errores
  process.on('uncaughtException', (error) => {
    logger.error('Error no capturado:', error.stack);
    process.exit(1);
  });
}

bootstrap();