import { Injectable, Inject } from '@nestjs/common';
import type { ICanSendContactEmail } from '../../domain/ports/queries/mail.port';
import { ContactMessageEntity } from '../../domain/entities/contact-message.entity';
import { ContactFormDto } from '../dto/contact-form.dto';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { MAIL_SEND_PORT } from '../../domain/constants/mail.tokens';

@Injectable()
export class SendContactFormUseCase {
  constructor(
    @Inject(MAIL_SEND_PORT)
    private readonly sender: ICanSendContactEmail,
    private readonly traceService: TraceService,
  ) {}

  async execute(dto: ContactFormDto, tracking: TrackingContext): Promise<void> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'SendContactFormUseCase', {
      email: dto.email,
      asunto: dto.asunto,
    });

    const message = new ContactMessageEntity(dto);
    await this.sender.sendContactForm(message, tracking);
  }
}
