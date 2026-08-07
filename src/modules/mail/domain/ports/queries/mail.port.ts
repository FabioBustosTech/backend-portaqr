import type { ContactMessage } from '../../entities/contact-message.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';

/** Puerto de envío de emails (implementado por infraestructura nodemailer) */
export interface ICanSendContactEmail {
  sendContactForm(message: ContactMessage, tracking: TrackingContext): Promise<void>;
}
