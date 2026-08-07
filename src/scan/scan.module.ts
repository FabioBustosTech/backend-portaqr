import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Scan, ScanSchema } from './entities/scan.entity';
import { ScanService } from './scan.service';
import { ScanController } from './scan.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Scan.name, schema: ScanSchema },
    ]),
  ],
  controllers: [ScanController],
  providers: [ScanService],
  exports: [ScanService],
})
export class ScanModule {}
