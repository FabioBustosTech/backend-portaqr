import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PetTagService } from './pet-tag.service';
import { PetTag } from './entities/pet-tag.entity';
import { CustomLogger } from '../shared/utils/logger.util';

describe('PetTagService', () => {
  let service: PetTagService;

  const mockPetTagModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    insertMany: jest.fn(),
    lean: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PetTagService,
        { provide: getModelToken(PetTag.name), useValue: mockPetTagModel },
        { provide: CustomLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<PetTagService>(PetTagService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});