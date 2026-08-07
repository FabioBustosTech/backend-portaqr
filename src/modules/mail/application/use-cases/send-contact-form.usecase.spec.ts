import { Test, TestingModule } from '@nestjs/testing';
import { SendContactFormUseCase } from './send-contact-form.usecase';
import { MAIL_SEND_PORT } from '../../domain/constants/mail.tokens';
import type { ICanSendContactEmail } from '../../domain/ports/queries/mail.port';
import { ContactMessageEntity } from '../../domain/entities/contact-message.entity';
import type { ContactFormDto } from '../dto/contact-form.dto';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';

describe('SendContactFormUseCase', () => {
  let useCase: SendContactFormUseCase;
  let sender: jest.Mocked<ICanSendContactEmail>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const dto: ContactFormDto = {
    nombre: 'Juan Pérez',
    email: 'juan@ejemplo.com',
    asunto: 'Consulta sobre servicios',
    mensaje: 'Me gustaría obtener más información',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SendContactFormUseCase,
        {
          provide: MAIL_SEND_PORT,
          useValue: {
            sendContactForm: jest.fn(),
          },
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

    useCase = module.get(SendContactFormUseCase);
    sender = module.get(MAIL_SEND_PORT) as jest.Mocked<ICanSendContactEmail>;
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe crear un ContactMessageEntity con los datos del dto y delegar el envío al puerto', async () => {
      sender.sendContactForm.mockResolvedValue(undefined);

      await useCase.execute(dto, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'SendContactFormUseCase',
        { email: dto.email, asunto: dto.asunto },
      );
      expect(sender.sendContactForm).toHaveBeenCalledTimes(1);

      const message = sender.sendContactForm.mock.calls[0][0] as ContactMessageEntity;
      expect(message).toBeInstanceOf(ContactMessageEntity);
      expect(message.nombre).toBe('Juan Pérez');
      expect(message.email).toBe('juan@ejemplo.com');
      expect(message.asunto).toBe('Consulta sobre servicios');
      expect(message.mensaje).toBe('Me gustaría obtener más información');
    });

    it('debe aplicar valores por defecto cuando el dto tiene campos vacíos', async () => {
      sender.sendContactForm.mockResolvedValue(undefined);

      const dtoVacio: ContactFormDto = {
        nombre: '',
        email: '',
        asunto: '',
        mensaje: '',
      };

      await useCase.execute(dtoVacio, tracking);

      const message = sender.sendContactForm.mock.calls[0][0] as ContactMessageEntity;
      expect(message.nombre).toBe('');
      expect(message.email).toBe('');
      expect(message.asunto).toBe('');
      expect(message.mensaje).toBe('');
    });

    it('debe propagar el error si el envío falla', async () => {
      sender.sendContactForm.mockRejectedValue(new Error('SMTP no disponible'));

      await expect(useCase.execute(dto, tracking)).rejects.toThrow(
        'SMTP no disponible',
      );
    });
  });
});