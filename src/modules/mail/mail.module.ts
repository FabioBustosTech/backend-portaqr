import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { MailController } from './presentation/controllers/mail.controller';
import { NodemailerContactAdapter } from './infrastructure/adapters/NodemailerContactAdapter';
import { SendContactFormUseCase } from './application/use-cases/send-contact-form.usecase';
import { MAIL_SEND_PORT } from './domain/constants/mail.tokens';

@Module({
  imports: [CommonModule],
  controllers: [MailController],
  providers: [
    SendContactFormUseCase,
    NodemailerContactAdapter,
    {
      provide: MAIL_SEND_PORT,
      useClass: NodemailerContactAdapter,
    },
  ],
  exports: [SendContactFormUseCase],
})
export class MailModule {}
