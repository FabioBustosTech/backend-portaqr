import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from 'src/common/common.module';
import { StorageModule } from 'src/modules/storage/storage.module';
import { PetTagController } from './presentation/controllers/pet-tag.controller';

import {
  PetTagSchema,
  PetTagSchemaDefinition,
} from './infrastructure/repository/mongo/schemas/pet-tag.schema';
import { MongoPetTagRepository } from './infrastructure/repository/mongo/mongo-pet-tag.repository';
import { PetTagRepositoryAdapter } from './infrastructure/adapters/PetTagRepositoryAdapter';

import { GeneratePetTagsUseCase } from './application/use-cases/generate-pet-tags.usecase';
import { GetReservedPetTagsUseCase } from './application/use-cases/get-reserved-pet-tags.usecase';
import { GetPetTagStatusUseCase } from './application/use-cases/get-pet-tag-status.usecase';
import { UpdatePetTagUseCase } from './application/use-cases/update-pet-tag.usecase';
import { ActivatePetTagUseCase } from './application/use-cases/activate-pet-tag.usecase';
import {
  UploadPetImageUseCase,
  DeletePetImageUseCase,
} from './application/use-cases/pet-tag-image.usecase';

import {
  PET_TAG_CREATE_PORT,
  PET_TAG_GET_PORT,
  PET_TAG_UPDATE_PORT,
} from './domain/constants/pet-tag.tokens';

@Module({
  imports: [
    CommonModule,
    StorageModule, // SPEC-016: StorageService + ImageProcessorService para la foto de la mascota
    MongooseModule.forFeature([
      { name: PetTagSchema.name, schema: PetTagSchemaDefinition },
    ]),
  ],
  controllers: [PetTagController],
  providers: [
    // Use Cases
    GeneratePetTagsUseCase,
    GetReservedPetTagsUseCase,
    GetPetTagStatusUseCase,
    UpdatePetTagUseCase,
    ActivatePetTagUseCase,
    UploadPetImageUseCase,
    DeletePetImageUseCase,

    // Repositories
    MongoPetTagRepository,
    PetTagRepositoryAdapter,

    // Puertos segregados (ISP)
    {
      provide: PET_TAG_CREATE_PORT,
      useClass: PetTagRepositoryAdapter,
    },
    {
      provide: PET_TAG_GET_PORT,
      useClass: PetTagRepositoryAdapter,
    },
    {
      provide: PET_TAG_UPDATE_PORT,
      useClass: PetTagRepositoryAdapter,
    },
  ],
  exports: [
    GeneratePetTagsUseCase,
    GetReservedPetTagsUseCase,
    GetPetTagStatusUseCase,
    UpdatePetTagUseCase,
    ActivatePetTagUseCase,
    UploadPetImageUseCase,
    DeletePetImageUseCase,
    // SPEC-016 fix: el port de lectura se exporta para que ScanModule resuelva
    // el dueño de scans de pet-tags (los pet-tags NO tienen QR espejo en `qrs`)
    PetTagRepositoryAdapter,
    PET_TAG_GET_PORT,
  ],
})
export class PetTagModule {}
