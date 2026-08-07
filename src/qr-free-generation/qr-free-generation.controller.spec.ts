import { Test, TestingModule } from '@nestjs/testing';
import { QrFreeGenerationController } from './qr-free-generation.controller';
import { QrFreeGenerationService } from './qr-free-generation.service';

describe('QrFreeGenerationController', () => {
  let controller: QrFreeGenerationController;

  const mockQrFreeGenerationService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QrFreeGenerationController],
      providers: [
        { provide: QrFreeGenerationService, useValue: mockQrFreeGenerationService },
      ],
    }).compile();

    controller = module.get<QrFreeGenerationController>(QrFreeGenerationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});