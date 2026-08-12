import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SendContactFormUseCase } from '../../application/use-cases/send-contact-form.usecase';
import { ContactFormDto } from '../../application/dto/contact-form.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { Tracking } from 'src/common/decorators/tracking.decorator';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
// SPEC-008 H4 (R4): 5 req/min en contacto (anti-spam, refuerza SPEC-006)
import { Throttle } from '@nestjs/throttler';
import { SENSITIVE_ENDPOINT_THROTTLE } from 'src/common/config/throttle.config';

@ApiTags('mail')
@Controller('mail')
export class MailController {
  constructor(
    private readonly sendContactFormUseCase: SendContactFormUseCase,
    private readonly traceService: TraceService,
  ) {}

  @Post('contact')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle(SENSITIVE_ENDPOINT_THROTTLE)
  @ApiOperation({ summary: 'Enviar formulario de contacto' })
  @ApiResponse({ status: 200, description: 'Email enviado exitosamente' })
  async sendContactForm(
    @Body() contactFormDto: ContactFormDto,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'POST /mail/contact', {
      email: contactFormDto.email,
    });
    await this.sendContactFormUseCase.execute(contactFormDto, tracking);
    return { message: 'Email enviado exitosamente' };
  }
}
