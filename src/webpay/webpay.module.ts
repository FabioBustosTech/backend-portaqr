import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { WebpayController } from './webpay.controller';
import { WebpayService } from './webpay.service';
import webpayConfig from './webpay.config';
import { Transaction, TransactionSchema } from './entities/webpay.entity';

@Module({
  imports: [
    ConfigModule.forFeature(webpayConfig),
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
  ],
  controllers: [WebpayController],
  providers: [WebpayService],
  exports: [WebpayService],
})
export class WebpayModule {}