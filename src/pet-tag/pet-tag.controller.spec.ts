import { Test, TestingModule } from '@nestjs/testing';
import { PetTagController } from './pet-tag.controller';
import { PetTagService } from './pet-tag.service';

describe('PetTagController', () => {
  let controller: PetTagController;

  const mockPetTagService = {
    generateBatch: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByQrId: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    activate: jest.fn(),
    getReservedTags: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PetTagController],
      providers: [
        { provide: PetTagService, useValue: mockPetTagService },
      ],
    }).compile();

    controller = module.get<PetTagController>(PetTagController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});