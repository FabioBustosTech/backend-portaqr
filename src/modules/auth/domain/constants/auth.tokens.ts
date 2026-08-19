// Tokens de inyección de dependencias para el módulo de autenticación
export const AUTH_SERVICE = 'AUTH_SERVICE';
export const JWT_SERVICE = 'JWT_SERVICE';

// Puertos de autenticación
export const AUTH_SERVICE_PORT = 'AUTH_SERVICE_PORT';
export const JWT_SERVICE_PORT = 'JWT_SERVICE_PORT';
// SPEC-009 A8: almacén de refresh tokens (rotación + detección de reuso)
export const REFRESH_TOKEN_STORE_PORT = 'REFRESH_TOKEN_STORE_PORT';
// SPEC-020 RF-27: puerto de envío del correo de bienvenida (ADR-019.8)
export const AUTH_EMAIL_PORT = 'AUTH_EMAIL_PORT';
// SPEC-020 RF-11: puerto de entrada del flujo Google OAuth
export const GOOGLE_AUTH_SERVICE_PORT = 'GOOGLE_AUTH_SERVICE_PORT';
