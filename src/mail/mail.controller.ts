import { Controller, Post, Body, HttpException, HttpStatus, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MailService } from './mail.service';
import { ContactFormDto } from './dto/contact-form.dto';
import { CustomLogger } from 'src/shared/utils/logger.util';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Mail')
@Controller('mail')
export class MailController {
  private readonly logger = new CustomLogger(MailController.name);

  constructor(private readonly mailService: MailService) {}

  @Post('contact')
  @Public()
  @ApiOperation({ summary: 'Enviar formulario de contacto' })
  @ApiResponse({ status: 200, description: 'Email enviado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos invÃ¡lidos' })
  async sendContactForm(@Body() contactFormDto: ContactFormDto, @Request() req) {
    const trackingId = req['trackingId'];

    try {
      this.logger.log('Recibida solicitud de envÃ­o de formulario de contacto', MailController.name, 'sendContactForm', trackingId);
      await this.mailService.sendContactForm(contactFormDto, trackingId);
      return { message: 'Email enviado exitosamente' };
    } catch (error) {
      this.logger.error(`Error al enviar formulario de contacto: ${error.message}`, error.stack, MailController.name, 'sendContactForm',trackingId);
      throw new HttpException(
        'Error al enviar el formulario de contacto',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
} 