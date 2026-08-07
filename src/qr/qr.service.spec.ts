import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { QrService } from './qr.service';
import { Qr } from './entities/qr.entity';
import { PetTag } from '../pet-tag/entities/pet-tag.entity';

describe('QrService', () => {
  let service: QrService;

  const mockQrModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    lean: jest.fn(),
  };

  const mockPetTagModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
    lean: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QrService,
        { provide: getModelToken(Qr.name), useValue: mockQrModel },
        { provide: getModelToken(PetTag.name), useValue: mockPetTagModel },
      ],
    }).compile();

    service = module.get<QrService>(QrService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});