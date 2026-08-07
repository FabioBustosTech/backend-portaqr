import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { QrActivateService } from './qr-activate.service';
import { QrActivate } from './entities/qr-activate.entity';
import { WebpayService } from '../webpay/webpay.service';
import { QrService } from '../qr/qr.service';

describe('QrActivateService', () => {
  let service: QrActivateService;

  const mockQrActivateModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockWebpayService = {
    createTransaction: jest.fn(),
    getTransaction: jest.fn(),
    refundTransaction: jest.fn(),
  };

  const mockQrService = {
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QrActivateService,
        { provide: getModelToken(QrActivate.name), useValue: mockQrActivateModel },
        { provide: WebpayService, useValue: mockWebpayService },
        { provide: QrService, useValue: mockQrService },
      ],
    }).compile();

    service = module.get<QrActivateService>(QrActivateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});