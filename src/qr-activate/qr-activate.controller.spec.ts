import { Test, TestingModule } from '@nestjs/testing';
import { QrActivateController } from './qr-activate.controller';
import { QrActivateService } from './qr-activate.service';

describe('QrActivateController', () => {
  let controller: QrActivateController;

  const mockQrActivateService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QrActivateController],
      providers: [
        { provide: QrActivateService, useValue: mockQrActivateService },
      ],
    }).compile();

    controller = module.get<QrActivateController>(QrActivateController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});