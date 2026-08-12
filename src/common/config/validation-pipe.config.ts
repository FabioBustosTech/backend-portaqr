/**
 * Configuración única del ValidationPipe global (SPEC-008 H2 — R3).
 * Compartida entre main.ts y los tests de integración para que estos
 * verifiquen exactamente la misma configuración que corre en producción.
 */
import { ValidationPipe } from '@nestjs/common';

export const APP_VALIDATION_PIPE_OPTIONS = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: false },
} as const;

export function createAppValidationPipe(): ValidationPipe {
  return new ValidationPipe(APP_VALIDATION_PIPE_OPTIONS);
}
