import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QrActivateService } from './qr-activate.service';
import { QrActivateController } from './qr-activate.controller';
import { AuthModule } from '../modules/auth/auth.module';
import { QrActivate, QrActivateSchema } from './entities/qr-activate.entity';
import { WebpayModule } from 'src/webpay/webpay.module';
import { QrModule } from 'src/qr/qr.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: QrActivate.name, schema: QrActivateSchema }
    ]),
    AuthModule,
    WebpayModule,
    QrModule
  ],
  controllers: [QrActivateController],
  providers: [QrActivateService],
  exports: [QrActivateService]
})
export class QrActivateModule {}