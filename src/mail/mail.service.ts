import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { ContactFormDto } from './dto/contact-form.dto';
import { CustomLogger } from 'src/shared/utils/logger.util';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new CustomLogger(MailService.name);

  constructor(private configService: ConfigService) {
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

  async sendContactForm(contactData: ContactFormDto, trackingId:string): Promise<void> {
    try {
      this.logger.log(`Enviando email de contacto desde: ${contactData.email}`, MailService.name, 'sendContactForm',trackingId);
      
      const mailOptions = {
        from: this.configService.get('EMAIL_FROM'),
        to: this.configService.get('SMTP_USER'), // El email de destino serÃ¡ el configurado en SMTP_USER
        subject: `Formulario de Contacto: ${contactData.asunto}`,
        html: `
          <h2>Nuevo mensaje de contacto</h2>
          <p><strong>Nombre:</strong> ${contactData.nombre}</p>
          <p><strong>Email:</strong> ${contactData.email}</p>
          <p><strong>Asunto:</strong> ${contactData.asunto}</p>
          <h3>Mensaje:</h3>
          <p>${contactData.mensaje}</p>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email de contacto enviado exitosamente desde: ${contactData.email}`, MailService.name, 'sendContactForm',trackingId);
    } catch (error) {
      this.logger.error(
        `Error al enviar email de contacto desde ${contactData.email}: ${error.message}`,
        error.stack,
        MailService.name,
        'sendContactForm',
        trackingId
      );
      throw error;
    }
  }
} 