import type { QrActivatedEmailPayload } from '../../../../shared/email/email.service';

/**
 * SPEC-019 ADR-019.8: puerto de envío del correo de activación de QRs.
 * Implementado estructuralmente por `EmailService` (shared/email) — la capa de
 * aplicación de qr-activate nunca depende de infraestructura concreta.
 */
export interface ICanSendQrActivatedEmail {
  sendQrActivatedEmail(payload: QrActivatedEmailPayload): Promise<void>;
}