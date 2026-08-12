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

    describe('escape HTML en la salida (SPEC-008 H1 — R1 XSS, CA-01)', () => {
      // Defensa en profundidad: aunque el DTO ya limpia el HTML en la entrada
      // (stripHtml), el adapter escapa por si recibe contenido sin transformar.
      const payloads: Array<[string, string, string]> = [
        ['mensaje', '</p><img src=x onerror=alert(1)>', '&lt;/p&gt;&lt;img src=x onerror=alert(1)&gt;'],
        ['nombre', '<script>alert("x")</script>', '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'],
        ['asunto', '<b onclick="hack()">asunto</b>', '&lt;b onclick=&quot;hack()&quot;&gt;asunto&lt;/b&gt;'],
        ['email', 'a@b.cl"><img src=x onerror=alert(1)>', 'a@b.cl&quot;&gt;&lt;img src=x onerror=alert(1)&gt;'],
      ];

      it.each(payloads)(
        'escapa %s inyectado con HTML malicioso (CA-01)',
        async (field, malicious, expected) => {
          mockSendMail.mockResolvedValue({ messageId: 'x' });

          const maliciousMessage: ContactMessage = {
            ...message,
            [field]: malicious,
          };

          await adapter.sendContactForm(maliciousMessage, tracking);

          const mailOptions = mockSendMail.mock.calls[0][0];
          expect(mailOptions.html).toContain(expected);
          // Ningún tag del payload debe sobrevivir interpretable
          // (el texto visible sí permanece, pero siempre escapado)
          expect(mailOptions.html).not.toContain('<img');
          expect(mailOptions.html).not.toContain('<script>');
          expect(mailOptions.html).not.toContain('<iframe');
          expect(mailOptions.html).not.toContain('</p><'); // cierre+etiqueta: técnica del payload
        },
      );

      it('muestra el texto visible del payload aunque esté escapado (CA-01)', async () => {
        mockSendMail.mockResolvedValue({ messageId: 'x' });

        const attack = '</p><img src=x onerror=alert(1)>';
        await adapter.sendContactForm({ ...message, mensaje: attack }, tracking);

        const mailOptions = mockSendMail.mock.calls[0][0];
        // El texto se preserva para el admin…
        expect(mailOptions.html).toContain('img src=x onerror=alert(1)');
        // …pero sin HTML ejecutable (solo los tags del template legítimo)
        expect(mailOptions.html).not.toContain('</p><');
        expect(mailOptions.html).not.toContain('<img');
        expect(mailOptions.html).not.toContain('<script');
        expect(mailOptions.html).not.toContain('<iframe');
      });

      it('no altera mensajes legítimos con acentos (regresión)', async () => {
        mockSendMail.mockResolvedValue({ messageId: 'x' });

        await adapter.sendContactForm(message, tracking);

        const mailOptions = mockSendMail.mock.calls[0][0];
        expect(mailOptions.html).toContain('Ana Gómez');
        expect(mailOptions.html).toContain('ana@ejemplo.com');
        expect(mailOptions.html).toContain('Quisiera saber los precios');
      });
    });

    describe('saltos de línea del mensaje (Textarea multilínea)', () => {
      it('convierte \n en <br> para que el admin vea el formato original', async () => {
        mockSendMail.mockResolvedValue({ messageId: 'x' });

        await adapter.sendContactForm(
          { ...message, mensaje: 'Línea 1\nLínea 2\nLínea 3' },
          tracking,
        );

        const mailOptions = mockSendMail.mock.calls[0][0];
        expect(mailOptions.html).toContain('Línea 1<br>Línea 2<br>Línea 3');
      });

      it('normaliza \r\n y \r a <br> (Windows/Mac)', async () => {
        mockSendMail.mockResolvedValue({ messageId: 'x' });

        await adapter.sendContactForm(
          { ...message, mensaje: 'a\r\nb\rc' },
          tracking,
        );

        const mailOptions = mockSendMail.mock.calls[0][0];
        expect(mailOptions.html).toContain('a<br>b<br>c');
        expect(mailOptions.html).not.toContain('\r');
        // El contenido del <p> del mensaje no conserva \n/\r crudos
        // (el \n de indentación del template es legítimo y no está en el contenido)
        const mensajeContent = mailOptions.html.match(/<h3>Mensaje:<\/h3>\s*<p>([\s\S]*?)<\/p>/)[1];
        expect(mensajeContent).not.toContain('\n');
        expect(mensajeContent).not.toContain('\r');
      });

      it('el usuario NO puede inyectar <br> propio: se escapa como texto (orden escape → salto)', async () => {
        mockSendMail.mockResolvedValue({ messageId: 'x' });

        await adapter.sendContactForm(
          { ...message, mensaje: 'real<br>malicioso' },
          tracking,
        );

        const mailOptions = mockSendMail.mock.calls[0][0];
        // El <br> del usuario llega escapado como texto, no como tag
        expect(mailOptions.html).toContain('real&lt;br&gt;malicioso');
        expect(mailOptions.html).not.toContain('real<br>malicioso');
      });

      it('payload XSS con saltos de línea no genera HTML ejecutable (solo <br> seguros)', async () => {
        mockSendMail.mockResolvedValue({ messageId: 'x' });

        const attack = '</p>\n<img\nsrc=x\nonerror=alert(1)>\n<script>bad()</script>';
        await adapter.sendContactForm({ ...message, mensaje: attack }, tracking);

        const mailOptions = mockSendMail.mock.calls[0][0];
        // No hay tags crudos del payload (el </p> del template es legítimo;
        // el texto onerror=alert(1) permanece visible pero escapado, no ejecutable)
        expect(mailOptions.html).not.toContain('<img');
        expect(mailOptions.html).not.toContain('<script');
        // Los únicos tags abiertos son los del template (p/strong/h2/h3) + <br>
        const openTags = mailOptions.html.match(/<(?![\/]?br\b)[a-z][a-z0-9]*/gi) ?? [];
        const allowedTemplateTags = ['p', 'strong', 'h2', 'h3'];
        for (const tag of openTags) {
          const name = tag.replace(/[<]/g, '').toLowerCase();
          expect(allowedTemplateTags).toContain(name);
        }
      });
    });
  });
});