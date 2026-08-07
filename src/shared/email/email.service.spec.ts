import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as ejs from 'ejs';
import { EmailService } from './email.service';

const mockSendMail = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn(() => '<html>{{ verificationCode }}</html>'),
}));

jest.mock('ejs', () => ({
  render: jest.fn(
    (template: string, data: Record<string, unknown>) =>
      `<html>rendered-${String(data.verificationCode ?? '')}</html>`,
  ),
}));

describe('EmailService', () => {
  let service: EmailService;
  let configServiceMock: { get: jest.Mock };

  const createTransportMock = nodemailer.createTransport as unknown as jest.Mock;
  const readFileSyncMock = fs.readFileSync as unknown as jest.Mock;
  const renderMock = ejs.render as unknown as jest.Mock;

  const baseConfig: Record<string, unknown> = {
    SMTP_HOST: 'smtp.ejemplo.com',
    SMTP_PORT: 587,
    SMTP_SECURE: false,
    SMTP_USER: 'no-reply@ejemplo.com',
    SMTP_PASS: 'secreto',
    SMTP_TTL: false,
    EMAIL_FROM: 'no-reply@portaqr.cl',
    FRONTEND_URL: 'http://localhost:3000',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    // Silenciar el logger interno del servicio
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    configServiceMock = {
      get: jest.fn((key: string) => baseConfig[key]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get(EmailService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('debe crear el transporter con la configuración SMTP', () => {
      expect(createTransportMock).toHaveBeenCalledWith({
        host: 'smtp.ejemplo.com',
        port: 587,
        secure: false,
        auth: {
          user: 'no-reply@ejemplo.com',
          pass: 'secreto',
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
    });
  });

  describe('sendVerificationEmail', () => {
    it('debe renderizar la plantilla y enviar el email de verificación', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'abc-123' });

      await service.sendVerificationEmail('user@example.com', 'user-1', '123456');

      expect(readFileSyncMock).toHaveBeenCalledWith(
        expect.stringContaining('registerEmail.ejs'),
        'utf-8',
      );
      expect(renderMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          verificationCode: '123456',
          userId: 'user-1',
          baseUrl: 'http://localhost:3000',
        }),
      );
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const mailOptions = mockSendMail.mock.calls[0][0];
      expect(mailOptions.from).toBe('no-reply@portaqr.cl');
      expect(mailOptions.to).toBe('user@example.com');
      expect(mailOptions.subject).toBe('Verifica tu correo electrónico');
      expect(mailOptions.html).toContain('rendered-');
    });

    it('debe usar la URL del frontend por defecto cuando no está configurada', async () => {
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'FRONTEND_URL') return undefined;
        return baseConfig[key];
      });
      mockSendMail.mockResolvedValue({ messageId: 'abc-123' });

      await service.sendVerificationEmail('user@example.com', 'user-1', '123456');

      expect(renderMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ baseUrl: 'http://localhost:3000' }),
      );
    });

    it('debe trazar el error y re-lanzarlo si el envío falla', async () => {
      mockSendMail.mockRejectedValue(new Error('Conexión rechazada'));

      await expect(
        service.sendVerificationEmail('user@example.com', 'user-1', '123456'),
      ).rejects.toThrow('Conexión rechazada');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('debe renderizar la plantilla y enviar el email de recuperación', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'abc-456' });

      await service.sendPasswordResetEmail('user@example.com', 'RESET123', 'Juan Pérez');

      expect(readFileSyncMock).toHaveBeenCalledWith(
        expect.stringContaining('passwordReset.ejs'),
        'utf-8',
      );
      expect(renderMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          user: { name: 'Juan Pérez' },
          verificationCode: 'RESET123',
          resetUrl: 'http://localhost:3000/forgot-password?codigo=RESET123&email=user@example.com',
        }),
      );
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const mailOptions = mockSendMail.mock.calls[0][0];
      expect(mailOptions.from).toBe('no-reply@portaqr.cl');
      expect(mailOptions.to).toBe('user@example.com');
      expect(mailOptions.subject).toBe('Restablece tu contraseña de Porta QR');
      expect(mailOptions.html).toContain('rendered-');
    });

    it('debe trazar el error y re-lanzarlo si el envío falla', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP caído'));

      await expect(
        service.sendPasswordResetEmail('user@example.com', 'RESET123', 'Juan'),
      ).rejects.toThrow('SMTP caído');
    });
  });
});