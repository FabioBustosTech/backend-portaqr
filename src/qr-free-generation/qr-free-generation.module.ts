import { Module } from '@nestjs/common';
import { QrFreeGenerationService } from './qr-free-generation.service';
import { QrFreeGenerationController } from './qr-free-generation.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { QrFreeGeneration, QrFreeGenerationSchema } from './entities/qr-free-generation.entity';
import { AuthModule } from 'src/modules/auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: QrFreeGeneration.name, schema: QrFreeGenerationSchema }]),
    AuthModule,
  ],
  controllers: [QrFreeGenerationController],
  providers: [QrFreeGenerationService],
  exports: [QrFreeGenerationService],
})
export class QrFreeGenerationModule {}
