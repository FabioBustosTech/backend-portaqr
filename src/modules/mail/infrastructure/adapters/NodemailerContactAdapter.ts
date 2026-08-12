import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { ICanSendContactEmail } from '../../domain/ports/queries/mail.port';
import type { ContactMessage } from '../../domain/entities/contact-message.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { escapeHtml } from 'src/common/utils/escape-html.util';

@Injectable()
export class NodemailerContactAdapter implements ICanSendContactEmail {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(NodemailerContactAdapter.name);

  constructor(
    private configService: ConfigService,
    private traceService: TraceService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendContactForm(message: ContactMessage, tracking: TrackingContext): Promise<void> {
    this.traceService.log(tracking, TraceLayer.SERVICE, 'NodemailerContactAdapter.sendContactForm', {
      email: message.email,
    });

    const mailOptions = {
      from: this.configService.get('EMAIL_FROM'),
      to: this.configService.get('SMTP_USER'),
      subject: `Formulario de Contacto: ${message.asunto}`,
      html: `
        <h2>Nuevo mensaje de contacto</h2>
        <p><strong>Nombre:</strong> ${escapeHtml(message.nombre)}</p>
        <p><strong>Email:</strong> ${escapeHtml(message.email)}</p>
        <p><strong>Asunto:</strong> ${escapeHtml(message.asunto)}</p>
        <h3>Mensaje:</h3>
        <p>${escapeHtml(message.mensaje)}</p>
      `,
    };

    await this.transporter.sendMail(mailOptions);
    this.traceService.log(tracking, TraceLayer.SERVICE, 'NodemailerContactAdapter.sendContactForm - enviado', {
      email: message.email,
    });
  }
}
