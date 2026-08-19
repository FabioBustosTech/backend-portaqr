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
  render: jest.fn((template: string, data: Record<string, unknown>) => {
    const items = (data.qrItems as Array<{ code: string }>) ?? [];
    const cids = items.map((i) => `cid:qr-${i.code}`).join(',');
    return `<html>rendered-${String(data.verificationCode ?? '')}${cids ? `-${cids}` : ''}</html>`;
  }),
}));

jest.mock('qrcode', () => ({
  toBuffer: jest.fn(() => Promise.resolve(Buffer.from('png-buffer-fake'))),
}));

describe('EmailService', () => {
  let service: EmailService;
  let configServiceMock: { get: jest.Mock };

  const createTransportMock = nodemailer.createTransport as unknown as jest.Mock;
  const readFileSyncMock = fs.readFileSync as unknown as jest.Mock;
  const renderMock = ejs.render as unknown as jest.Mock;
  const qrCodeToBufferMock = (require('qrcode') as { toBuffer: jest.Mock }).toBuffer;

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

  describe('sendQrActivatedEmail (SPEC-019 RF-2)', () => {
    const payload = {
      to: 'cliente@example.com',
      userName: 'Juan Pérez',
      qrItems: [
        {
          code: 'abc123',
          typeQr: 'dynamic',
          typeLabel: 'QR Dinámico',
          landingUrl: 'http://localhost:3000/qr/xyz?origen=qr',
          activationDate: new Date('2026-08-17T12:00:00Z'),
          expirationDate: new Date('2027-08-17T12:00:00Z'),
        },
        {
          code: 'def456',
          name: 'Mi QR Multi links',
          typeQr: 'list',
          typeLabel: 'QR Multi links',
          landingUrl: 'http://localhost:3000/qr/uvw?origen=qr',
        },
      ],
      methodActivation: 'WEBPAY',
      totalPrice: 9990,
    };

    it('debe renderizar qrActivated.ejs y enviar con to/subject/html conteniendo cid y landingUrl', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'abc-789' });

      await service.sendQrActivatedEmail(payload);

      expect(readFileSyncMock).toHaveBeenCalledWith(
        expect.stringContaining('qrActivated.ejs'),
        'utf-8',
      );
      expect(renderMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          to: 'cliente@example.com',
          userName: 'Juan Pérez',
          qrItems: expect.arrayContaining([
            expect.objectContaining({ code: 'abc123', landingUrl: 'http://localhost:3000/qr/xyz?origen=qr' }),
            expect.objectContaining({ code: 'def456', landingUrl: 'http://localhost:3000/qr/uvw?origen=qr' }),
          ]),
          methodActivation: 'WEBPAY',
          totalPrice: 9990,
          baseUrl: 'http://localhost:3000',
          dashboardUrl: 'http://localhost:3000/dashboard/qr',
        }),
      );
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const mailOptions = mockSendMail.mock.calls[0][0];
      expect(mailOptions.from).toBe('no-reply@portaqr.cl');
      expect(mailOptions.to).toBe('cliente@example.com');
      expect(mailOptions.subject).toBe('Tus códigos QR han sido activados | Porta QR');
      expect(mailOptions.html).toContain('cid:qr-abc123');
      expect(mailOptions.html).toContain('cid:qr-def456');
    });

    it('debe generar un attachment PNG por QR con cid único y buffer no vacío', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'abc-789' });

      await service.sendQrActivatedEmail(payload);

      expect(qrCodeToBufferMock).toHaveBeenCalledTimes(2);
      expect(qrCodeToBufferMock).toHaveBeenCalledWith('http://localhost:3000/qr/xyz?origen=qr', {
        width: 200,
        margin: 2,
        errorCorrectionLevel: 'H',
      });
      expect(qrCodeToBufferMock).toHaveBeenCalledWith('http://localhost:3000/qr/uvw?origen=qr', {
        width: 200,
        margin: 2,
        errorCorrectionLevel: 'H',
      });

      const mailOptions = mockSendMail.mock.calls[0][0];
      expect(mailOptions.attachments).toHaveLength(2);
      expect(mailOptions.attachments[0]).toEqual({
        filename: 'qr-abc123.png',
        content: Buffer.from('png-buffer-fake'),
        cid: 'qr-abc123',
      });
      expect(mailOptions.attachments[1]).toEqual({
        filename: 'qr-def456.png',
        content: Buffer.from('png-buffer-fake'),
        cid: 'qr-def456',
      });
      expect(mailOptions.attachments[0].content.length).toBeGreaterThan(0);
    });

    it('debe trazar el error y re-lanzarlo si el envío falla', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP caído'));

      await expect(service.sendQrActivatedEmail(payload)).rejects.toThrow('SMTP caído');
    });

    it('no debe enviar cuando EMAIL_ACTIVATION_ENABLED=false (RF-2.1)', async () => {
      configServiceMock.get.mockImplementation((key: string) =>
        key === 'EMAIL_ACTIVATION_ENABLED' ? 'false' : baseConfig[key],
      );

      await service.sendQrActivatedEmail(payload);

      expect(mockSendMail).not.toHaveBeenCalled();
      expect(readFileSyncMock).not.toHaveBeenCalled();
      expect(qrCodeToBufferMock).not.toHaveBeenCalled();
    });

    it('debe enviar por defecto cuando EMAIL_ACTIVATION_ENABLED no está definida (RF-2.1)', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'abc-790' });

      await service.sendQrActivatedEmail(payload);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendWelcomeEmail (SPEC-020 RF-23)', () => {
    it('debe renderizar welcomeEmail.ejs y enviar el correo de bienvenida', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'abc-991' });

      await service.sendWelcomeEmail('user@example.com');

      expect(readFileSyncMock).toHaveBeenCalledWith(
        expect.stringContaining('welcomeEmail.ejs'),
        'utf-8',
      );
      expect(renderMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ baseUrl: 'http://localhost:3000' }),
      );
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const mailOptions = mockSendMail.mock.calls[0][0];
      expect(mailOptions.from).toBe('no-reply@portaqr.cl');
      expect(mailOptions.to).toBe('user@example.com');
      expect(mailOptions.subject).toBe('¡Bienvenido(a) a Porta QR!');
      expect(mailOptions.html).toContain('rendered-');
    });

    it('no debe enviar cuando WELCOME_EMAIL_ENABLED=false (RF-23)', async () => {
      configServiceMock.get.mockImplementation((key: string) =>
        key === 'WELCOME_EMAIL_ENABLED' ? 'false' : baseConfig[key],
      );

      await service.sendWelcomeEmail('user@example.com');

      expect(mockSendMail).not.toHaveBeenCalled();
      expect(readFileSyncMock).not.toHaveBeenCalled();
    });

    it('debe enviar por defecto cuando WELCOME_EMAIL_ENABLED no está definida (default true)', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'abc-992' });

      await service.sendWelcomeEmail('user@example.com');

      expect(mockSendMail).toHaveBeenCalledTimes(1);
    });

    it('debe trazar el error y re-lanzarlo si el envío falla', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP caído'));

      await expect(service.sendWelcomeEmail('user@example.com')).rejects.toThrow('SMTP caído');
    });
  });
});