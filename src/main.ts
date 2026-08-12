import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ResponseLoggerInterceptor } from './interceptors/response-logger.interceptor';
import { LegacyIdAliasInterceptor } from './interceptors/legacy-id-alias.interceptor';
import { createAppValidationPipe } from './common/config/validation-pipe.config';
import { HELMET_OPTIONS, parseCorsOrigins } from './common/config/security.config';
// SPEC-008 H4 (R4): helmet (headers seguros) — CJS/ESM dual, usa export default
import helmet from 'helmet';
// SPEC-008 H5b (H6): strip de $ y . en body/query/params (defensa en profundidad)
import { MongoSanitizeInterceptor } from './interceptors/mongo-sanitize.interceptor';

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

  // SPEC-008 H4 (R4): helmet — headers de seguridad (CSP, nosniff, X-Frame-Options…)
  // CSP con style-src 'unsafe-inline' para no romper los templates EJS de email.
  app.use(helmet(HELMET_OPTIONS));

  // SPEC-008 H5b (H6, defensa en profundidad): elimina claves con $ y . de
  // body/query/params ANTES del ValidationPipe — protege endpoints futuros sin DTO.
  // Interceptor global (no middleware): corre tras el body-parser de Nest y
  // antes del pipe (un app.use() vería req.body aún undefined).
  // (La Capa 2 ya bloquea operadores NoSQL vía forbidNonWhitelisted.)
  app.useGlobalInterceptors(new MongoSanitizeInterceptor());

  // SPEC-008 H4 (R4): CORS whitelist — CORS_ORIGINS separado por comas en prod,
  // '*' (o vacío) en dev. Bloquea orígenes no autorizados.
  const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGINS);
  logger.log(
    `CORS: orígenes permitidos = ${Array.isArray(corsOrigins) ? corsOrigins.join(', ') : corsOrigins}`,
  );
  app.enableCors({
    origin: corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Accept,Authorization',
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