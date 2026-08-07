import { Test, TestingModule } from '@nestjs/testing';
import { QrController } from './qr.controller';
import { QrService } from './qr.service';

describe('QrController', () => {
  let controller: QrController;

  const mockQrService = {
    create: jest.fn(),
    findAllWithSearch: jest.fn(),
    findOne: jest.fn(),
    findByUserId: jest.fn(),
    findPaginatedByUser: jest.fn(),
    findUserByFavorites: jest.fn(),
    getRecentActive: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QrController],
      providers: [
        { provide: QrService, useValue: mockQrService },
      ],
    }).compile();

    controller = module.get<QrController>(QrController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});