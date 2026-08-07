import { Test, TestingModule } from '@nestjs/testing';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { NodemailerContactAdapter } from './NodemailerContactAdapter';
import type { ContactMessage } from '../../domain/entities/contact-message.entity';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';

const mockSendMail = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}));

describe('NodemailerContactAdapter', () => {
  let adapter: NodemailerContactAdapter;
  let configServiceMock: { get: jest.Mock };
  let traceService: jest.Mocked<TraceService>;

  const createTransportMock = nodemailer.createTransport as jest.Mock;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const message: ContactMessage = {
    nombre: 'Ana Gómez',
    email: 'ana@ejemplo.com',
    asunto: 'Consulta general',
    mensaje: 'Quisiera saber los precios',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    configServiceMock = {
      get: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          SMTP_HOST: 'smtp.ejemplo.com',
          SMTP_PORT: 587,
          SMTP_USER: 'contacto@ejemplo.com',
          SMTP_PASS: 'secreto',
          EMAIL_FROM: 'no-reply@ejemplo.com',
        };
        return values[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NodemailerContactAdapter,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
        {
          provide: TraceService,
          useValue: {
            log: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    adapter = module.get(NodemailerContactAdapter);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(adapter).toBeDefined();
  });

  it('debe crear el transporter con la configuración SMTP', () => {
    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'smtp.ejemplo.com',
      port: 587,
      secure: false,
      auth: {
        user: 'contacto@ejemplo.com',
        pass: 'secreto',
      },
    });
  });

  describe('sendContactForm', () => {
    it('debe enviar el email con los datos del mensaje y trazar el envío', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'abc-123' });

      await adapter.sendContactForm(message, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.SERVICE,
        'NodemailerContactAdapter.sendContactForm',
        { email: message.email },
      );

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const mailOptions = mockSendMail.mock.calls[0][0];
      expect(mailOptions.from).toBe('no-reply@ejemplo.com');
      expect(mailOptions.to).toBe('contacto@ejemplo.com');
      expect(mailOptions.subject).toBe(
        'Formulario de Contacto: Consulta general',
      );
      expect(mailOptions.html).toContain('Ana Gómez');
      expect(mailOptions.html).toContain('ana@ejemplo.com');
      expect(mailOptions.html).toContain('Quisiera saber los precios');

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.SERVICE,
        'NodemailerContactAdapter.sendContactForm - enviado',
        { email: message.email },
      );
    });

    it('debe propagar el error si sendMail falla', async () => {
      mockSendMail.mockRejectedValue(new Error('Conexión rechazada'));

      await expect(adapter.sendContactForm(message, tracking)).rejects.toThrow(
        'Conexión rechazada',
      );
    });
  });
});