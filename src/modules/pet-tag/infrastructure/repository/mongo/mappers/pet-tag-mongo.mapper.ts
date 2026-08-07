import type { PetTag, PetData } from '../../../../domain/entities/pet-tag.entity';
import type { PetTagSchema, PetDataSchema } from '../schemas/pet-tag.schema';

export class PetTagMongoMapper {
  static toEntity(doc: PetTagSchema & { _id?: unknown }): PetTag {
    return {
      id: doc._id?.toString() || '',
      name: doc.name,
      idQr: doc.idQr,
      userId: doc.userId?.toString?.() || null,
      activationPin: doc.activationPin,
      status: doc.status,
      petData: doc.petData ? PetTagMongoMapper.toPetDataEntity(doc.petData) : null,
      expiration: doc.expiration,
      commercialStatus: doc.commercialStatus,
      isFavorite: doc.isFavorite,
      assignedStoreName: doc.assignedStoreName,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  static toPetDataEntity(doc: PetDataSchema): PetData {
    return {
      ownerName: doc.ownerName,
      address: doc.address,
      phone: doc.phone,
      petName: doc.petName,
      birthDate: doc.birthDate,
      breed: doc.breed,
      gender: doc.gender,
      species: doc.species,
      dietFrequency: doc.dietFrequency,
      diseases: doc.diseases,
      vaccines: doc.vaccines,
      observations: doc.observations,
    };
  }

  static toSchemaData(tag: Partial<PetTag>): Partial<PetTagSchema> {
    return {
      name: tag.name,
      idQr: tag.idQr,
      userId: (tag.userId as any) || null,
      activationPin: tag.activationPin,
      status: tag.status,
      petData: tag.petData as any,
      expiration: tag.expiration,
      commercialStatus: tag.commercialStatus,
      isFavorite: tag.isFavorite,
      assignedStoreName: tag.assignedStoreName,
    };
  }
}
