import { Module } from '@nestjs/common';
import { PetTagService } from './pet-tag.service';
import { PetTagController } from './pet-tag.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { PetTag, PetTagSchema } from './entities/pet-tag.entity';
import { AuthModule } from 'src/modules/auth/auth.module';
import { CustomLogger } from 'src/shared/utils/logger.util';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PetTag.name, schema: PetTagSchema }]),
    AuthModule,
  ],
  controllers: [PetTagController],
  providers: [PetTagService, CustomLogger],
  exports: [PetTagService],
})
export class PetTagModule {}
