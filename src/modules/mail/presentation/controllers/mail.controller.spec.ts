import { Test, TestingModule } from '@nestjs/testing';
import { MailController } from './mail.controller';
import { SendContactFormUseCase } from '../../application/use-cases/send-contact-form.usecase';
import type { ContactFormDto } from '../../application/dto/contact-form.dto';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';

describe('MailController', () => {
  let controller: MailController;
  let sendContactFormUseCase: jest.Mocked<SendContactFormUseCase>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const contactFormDto: ContactFormDto = {
    nombre: 'Juan Pérez',
    email: 'juan@ejemplo.com',
    asunto: 'Consulta',
    mensaje: 'Hola, necesito información',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MailController],
      providers: [
        {
          provide: SendContactFormUseCase,
          useValue: {
            execute: jest.fn(),
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

    controller = module.get(MailController);
    sendContactFormUseCase = module.get(SendContactFormUseCase);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('sendContactForm', () => {
    it('debe delegar en el use-case y retornar mensaje de éxito', async () => {
      sendContactFormUseCase.execute.mockResolvedValue(undefined);

      const result = await controller.sendContactForm(contactFormDto, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'POST /mail/contact',
        { email: contactFormDto.email },
      );
      expect(sendContactFormUseCase.execute).toHaveBeenCalledWith(
        contactFormDto,
        tracking,
      );
      expect(result).toEqual({ message: 'Email enviado exitosamente' });
    });

    it('debe propagar el error si el use-case falla', async () => {
      sendContactFormUseCase.execute.mockRejectedValue(
        new Error('Error de envío'),
      );

      await expect(
        controller.sendContactForm(contactFormDto, tracking),
      ).rejects.toThrow('Error de envío');
    });
  });
});