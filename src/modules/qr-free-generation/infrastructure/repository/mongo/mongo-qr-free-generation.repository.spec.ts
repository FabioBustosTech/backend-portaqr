import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoQrFreeGenerationRepository } from './mongo-qr-free-generation.repository';
import {
  QrFreeGenerationSchema,
  QrFreeGenerationDocument,
} from './schemas/qr-free-generation.schema';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import type { QrFreeGeneration } from '../../../domain/entities/qr-free-generation.entity';

const mockSave = jest.fn();
const mockFind = jest.fn();
const mockFindById = jest.fn();
const mockCountDocuments = jest.fn();

const modelMock = jest.fn().mockImplementation((data: Record<string, unknown>) => ({
  ...data,
  save: mockSave,
})) as unknown as Model<QrFreeGenerationDocument>;

(modelMock as unknown as Record<string, unknown>).find = mockFind;
(modelMock as unknown as Record<string, unknown>).findById = mockFindById;
(modelMock as unknown as Record<string, unknown>).countDocuments = mockCountDocuments;

describe('MongoQrFreeGenerationRepository', () => {
  let repository: MongoQrFreeGenerationRepository;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const qrFreeGeneration: QrFreeGeneration = {
    id: 'qr-1',
    email: 'user@example.com',
    information: { typeQr: 'TEXT', data: 'Hola mundo' },
    location: { latitude: -33.4, longitude: -70.6, country: 'CL', city: 'Santiago' },
    device: { platform: 'web', browser: 'Chrome', isMobile: false },
  };

  const doc = {
    _id: { toString: () => 'qr-1' },
    email: 'user@example.com',
    information: { typeQr: 'TEXT', data: 'Hola mundo' },
    location: { latitude: -33.4, longitude: -70.6, country: 'CL', city: 'Santiago' },
    device: { platform: 'web', browser: 'Chrome', isMobile: false },
    createdAt: new Date('2024-01-01'),
  };

  const buildFindChain = (result: unknown) => ({
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(result) }),
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongoQrFreeGenerationRepository,
        {
          provide: getModelToken(QrFreeGenerationSchema.name),
          useValue: modelMock,
        },
        {
          provide: TraceService,
          useValue: {
            log: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get(MongoQrFreeGenerationRepository);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('debe crear el documento con el mapper y retornar la entidad mapeada', async () => {
      mockSave.mockResolvedValue(doc);

      const result = await repository.create(qrFreeGeneration, tracking);

      expect(modelMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'user@example.com',
          information: { typeQr: 'TEXT', data: 'Hola mundo' },
        }),
      );
      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        ...qrFreeGeneration,
        createdAt: doc.createdAt,
      });
    });

    it('debe trazar y re-lanzar el error si el guardado falla', async () => {
      mockSave.mockRejectedValue(new Error('DB down'));

      await expect(repository.create(qrFreeGeneration, tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'create:error',
        expect.any(Error),
      );
    });
  });

  describe('getAll', () => {
    it('debe retornar items paginados sin búsqueda', async () => {
      mockFind.mockReturnValue(buildFindChain([doc]));
      mockCountDocuments.mockResolvedValue(1);

      const result = await repository.getAll(1, 10, '', tracking);

      expect(mockFind).toHaveBeenCalledWith({});
      expect(result).toEqual({
        items: [expect.objectContaining({ id: 'qr-1', email: 'user@example.com' })],
        total: 1,
      });
    });

    it('debe construir el filtro de búsqueda con $or', async () => {
      mockFind.mockReturnValue(buildFindChain([]));
      mockCountDocuments.mockResolvedValue(0);

      await repository.getAll(1, 10, 'hola', tracking);

      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: [
            { email: { $regex: 'hola', $options: 'i' } },
            { 'information.data': { $regex: 'hola', $options: 'i' } },
          ],
        }),
      );
    });

    it('debe trazar y re-lanzar el error si la consulta falla', async () => {
      mockFind.mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(new Error('DB down')),
        }),
      });

      await expect(repository.getAll(1, 10, '', tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getAll:error',
        expect.any(Error),
      );
    });
  });

  describe('getById', () => {
    it('debe retornar la entidad mapeada cuando encuentra el registro', async () => {
      mockFindById.mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) }),
      });

      const result = await repository.getById('qr-1', tracking);

      expect(mockFindById).toHaveBeenCalledWith('qr-1');
      expect(result).toEqual(
        expect.objectContaining({ id: 'qr-1', email: 'user@example.com' }),
      );
    });

    it('debe retornar null cuando no encuentra el registro', async () => {
      mockFindById.mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      });

      const result = await repository.getById('qr-inexistente', tracking);

      expect(result).toBeNull();
    });

    it('debe trazar y re-lanzar el error si la consulta falla', async () => {
      mockFindById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(new Error('DB down')),
        }),
      });

      await expect(repository.getById('qr-1', tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getById:error',
        expect.any(Error),
      );
    });
  });
});