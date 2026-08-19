/**
 * SPEC-020 RF-27 (ADR-019.8): puerto de envío del correo de bienvenida.
 * Implementado estructuralmente por `EmailService` (shared/email) — la capa de
 * aplicación de auth nunca depende de infraestructura concreta.
 */
export interface ICanSendWelcomeEmail {
  sendWelcomeEmail(email: string): Promise<void>;
}