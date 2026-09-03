import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * SPEC-030 RF-8: sincronización best-effort del intent de newsletter al CMS.
 *
 * El CMS (qr-cms) es la fuente de verdad (ADR-030.1); este servicio solo
 * reporta intents vía POST server-to-server con API key. Un fallo NUNCA
 * rompe el flujo de cuentas (RN-2): se loguea `newsletter_sync_failed` y
 * el caller deja `newsletterSyncedAt = null` para reintento futuro.
 *
 * Kill-switch: NEWSLETTER_SYNC_ENABLED (default true; solo 'false' desactiva),
 * mismo patrón que WELCOME_EMAIL_ENABLED / EMAIL_ACTIVATION_ENABLED.
 */
export type NewsletterSyncSource = 'signup' | 'onboarding' | 'settings';

export interface NewsletterSyncInput {
  email: string;
  name?: string;
  userId: string;
  source: NewsletterSyncSource;
}

const SYNC_TIMEOUT_MS = 5000;

@Injectable()
export class NewsletterSyncService {
  private readonly logger = new Logger(NewsletterSyncService.name);

  constructor(private readonly configService: ConfigService) {}

  /** true salvo 'false' explícito (permite desactivar en local/staging). */
  isEnabled(): boolean {
    return (this.configService.get<string>('NEWSLETTER_SYNC_ENABLED') ?? 'true') !== 'false';
  }

  /**
   * Sincroniza un alta (opt-in). Retorna true si el CMS confirmó.
   * Nunca lanza: cualquier fallo → false + warn.
   */
  async syncSubscribe(input: NewsletterSyncInput): Promise<boolean> {
    if (!this.isEnabled()) {
      this.logger.log(
        `Sync newsletter DESACTIVADO (NEWSLETTER_SYNC_ENABLED=false) — usuario: ${input.userId}`,
      );
      return false;
    }
    const baseUrl = (this.configService.get<string>('CMS_BASE_URL') || '').replace(/\/$/, '');
    const apiKey = this.configService.get<string>('CMS_NEWSLETTER_API_KEY') || '';
    if (!baseUrl || !apiKey) {
      this.logger.warn(
        `newsletter_sync_failed { userId: ${input.userId}, reason: cms-no-configurado }`,
      );
      return false;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);
    try {
      const response = await fetch(`${baseUrl}/api/newsletter/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-newsletter-api-key': apiKey,
        },
        body: JSON.stringify({
          email: input.email,
          name: input.name,
          userId: input.userId,
          source: input.source,
          consentAt: new Date().toISOString(),
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        this.logger.warn(
          `newsletter_sync_failed { userId: ${input.userId}, reason: cms-${response.status} }`,
        );
        return false;
      }
      return true;
    } catch (error) {
      const reason = error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'red';
      this.logger.warn(`newsletter_sync_failed { userId: ${input.userId}, reason: ${reason} }`);
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Sincroniza una baja (toggle off en settings). Best-effort igual que el alta.
   */
  async syncUnsubscribe(email: string, userId: string): Promise<boolean> {
    if (!this.isEnabled()) return false;
    const baseUrl = (this.configService.get<string>('CMS_BASE_URL') || '').replace(/\/$/, '');
    const apiKey = this.configService.get<string>('CMS_NEWSLETTER_API_KEY') || '';
    if (!baseUrl || !apiKey) {
      this.logger.warn(
        `newsletter_sync_failed { userId: ${userId}, reason: cms-no-configurado }`,
      );
      return false;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);
    try {
      const response = await fetch(`${baseUrl}/api/newsletter/unsubscribe-by-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-newsletter-api-key': apiKey,
        },
        body: JSON.stringify({ email }),
        signal: controller.signal,
      });
      if (!response.ok) {
        this.logger.warn(
          `newsletter_sync_failed { userId: ${userId}, reason: cms-${response.status} }`,
        );
        return false;
      }
      return true;
    } catch {
      this.logger.warn(`newsletter_sync_failed { userId: ${userId}, reason: red }`);
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
}
