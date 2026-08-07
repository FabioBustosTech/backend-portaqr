import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { QrFreeGenerationService } from './qr-free-generation.service';
import { QrFreeGeneration } from './entities/qr-free-generation.entity';

describe('QrFreeGenerationService', () => {
  let service: QrFreeGenerationService;

  const mockQrFreeGenerationModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QrFreeGenerationService,
        { provide: getModelToken(QrFreeGeneration.name), useValue: mockQrFreeGenerationModel },
      ],
    }).compile();

    service = module.get<QrFreeGenerationService>(QrFreeGenerationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});