import { Module } from '@nestjs/common';
import { QrService } from './qr.service';
import { QrController } from './qr.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Qr, QrSchema } from './entities/qr.entity';
import { PetTag, PetTagSchema } from '../pet-tag/entities/pet-tag.entity';
import { AuthModule } from '../modules/auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Qr.name, schema: QrSchema },
      { name: PetTag.name, schema: PetTagSchema }
    ]),
    AuthModule,
  ],
  controllers: [QrController],
  providers: [QrService],
  exports: [QrService],
})
export class QrModule {}
