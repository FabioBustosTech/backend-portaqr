import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { CustomLogger } from '../utils/logger.util';
import * as fs from 'fs';
import * as ejs from 'ejs';
import * as path from 'path';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new CustomLogger(EmailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>("SMTP_HOST")  ,
      port: this.configService.get<string>("SMTP_PORT") ,
      secure: this.configService.get<string>("SMTP_SECURE"),
      auth: {
        user: this.configService.get<string>("SMTP_USER"),
        pass: this.configService.get<string>("SMTP_PASS"),
      },
      tls: {
        rejectUnauthorized: this.configService.get<string>("SMTP_TTL"), // opcional si el certificado no es válido
      },
    });
  }

  async sendVerificationEmail(email: string, id:string, verificationCode: string): Promise<void> {
    try {
      this.logger.log(`Enviando email de verificación a: ${email}`, EmailService.name, 'sendVerificationEmail');
      
      const templatePath = path.join(__dirname, '..', '..' ,'templateEmail', 'registerEmail.ejs');
      this.logger.log(`Template path: ${templatePath}`, EmailService.name, 'sendVerificationEmail');
      const template = fs.readFileSync(templatePath, 'utf-8');
      const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      const html = ejs.render(template, { 
        verificationCode, 
        userId: id,
        baseUrl
      });
      
      const mailOptions = {
        from: this.configService.get('EMAIL_FROM'),
        to: email,
        subject: 'Verifica tu correo electrónico',
        html,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email de verificación enviado exitosamente a: ${email}`, EmailService.name, 'sendVerificationEmail');
    } catch (error) {
      this.logger.error(
        `Error al enviar email de verificación a ${email}: ${error.message}`,
        error.stack,
        EmailService.name,
        'sendVerificationEmail'
      );
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string, resetCode: string, nombreCompleto: string): Promise<void> {
    try {
      this.logger.log(`Enviando email de recuperación de contraseña a: ${email}`, EmailService.name, 'sendPasswordResetEmail');
      console.log("nombreCompleto",nombreCompleto);
      
      // Crear un objeto de usuario con el nombre completo
      const user = { name: nombreCompleto };
      
      // Generar URL de reseteo (puedes ajustar según tu configuración)
      const resetUrl = `${this.configService.get('FRONTEND_URL')}/forgot-password?codigo=${resetCode}&email=${email}`;
      
      const templatePath = path.join(__dirname, '..', '..', 'templateEmail', 'passwordReset.ejs');
      const template = fs.readFileSync(templatePath, 'utf-8');
      const html = ejs.render(template, { 
        user,
        resetUrl,
        verificationCode: resetCode
      });
      
      const mailOptions = {
        from: this.configService.get('EMAIL_FROM'),
        to: email,
        subject: 'Restablece tu contraseña de Porta QR',
        html,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email de recuperación enviado exitosamente a: ${email}`, EmailService.name, 'sendPasswordResetEmail');
    } catch (error) {
      this.logger.error(
        `Error al enviar email de recuperación a ${email}: ${error.message}`,
        error.stack,
        EmailService.name,
        'sendPasswordResetEmail'
      );
      throw error;
    }
  }
}