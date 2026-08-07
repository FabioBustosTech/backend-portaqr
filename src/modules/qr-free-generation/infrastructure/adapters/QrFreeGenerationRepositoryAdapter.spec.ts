import { Test, TestingModule } from '@nestjs/testing';
import { QrFreeGenerationRepositoryAdapter } from './QrFreeGenerationRepositoryAdapter';
import { MongoQrFreeGenerationRepository } from '../repository/mongo/mongo-qr-free-generation.repository';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import type {
  QrFreeGeneration,
  PaginatedQrFreeGenerations,
} from '../../domain/entities/qr-free-generation.entity';

describe('QrFreeGenerationRepositoryAdapter', () => {
  let adapter: QrFreeGenerationRepositoryAdapter;
  let mongoRepository: jest.Mocked<MongoQrFreeGenerationRepository>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const qrFreeGeneration: QrFreeGeneration = {
    id: 'qr-1',
    email: 'user@example.com',
    information: { typeQr: 'TEXT', data: 'Hola' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QrFreeGenerationRepositoryAdapter,
        {
          provide: MongoQrFreeGenerationRepository,
          useValue: {
            create: jest.fn(),
            getAll: jest.fn(),
            getById: jest.fn(),
          },
        },
      ],
    }).compile();

    adapter = module.get(QrFreeGenerationRepositoryAdapter);
    mongoRepository = module.get(MongoQrFreeGenerationRepository);
  });

  it('debe estar definido', () => {
    expect(adapter).toBeDefined();
  });

  describe('create', () => {
    it('debe delegar la creación al repositorio mongo', async () => {
      mongoRepository.create.mockResolvedValue(qrFreeGeneration);

      const result = await adapter.create(qrFreeGeneration, tracking);

      expect(mongoRepository.create).toHaveBeenCalledWith(qrFreeGeneration, tracking);
      expect(result).toEqual(qrFreeGeneration);
    });
  });

  describe('getAll', () => {
    it('debe delegar la consulta paginada al repositorio mongo', async () => {
      const paginated: PaginatedQrFreeGenerations = {
        items: [qrFreeGeneration],
        total: 1,
      };
      mongoRepository.getAll.mockResolvedValue(paginated);

      const result = await adapter.getAll(1, 10, '', tracking);

      expect(mongoRepository.getAll).toHaveBeenCalledWith(1, 10, '', tracking);
      expect(result).toEqual(paginated);
    });
  });

  describe('getById', () => {
    it('debe delegar la consulta por id al repositorio mongo', async () => {
      mongoRepository.getById.mockResolvedValue(qrFreeGeneration);

      const result = await adapter.getById('qr-1', tracking);

      expect(mongoRepository.getById).toHaveBeenCalledWith('qr-1', tracking);
      expect(result).toEqual(qrFreeGeneration);
    });

    it('debe retornar null cuando el repositorio no encuentra el registro', async () => {
      mongoRepository.getById.mockResolvedValue(null);

      const result = await adapter.getById('qr-inexistente', tracking);

      expect(result).toBeNull();
    });
  });
});