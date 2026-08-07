import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ResponseLoggerInterceptor } from './interceptors/response-logger.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'], // Habilitamos todos los niveles de log
  });

  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new ResponseLoggerInterceptor());

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