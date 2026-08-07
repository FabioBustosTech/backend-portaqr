import { Test, TestingModule } from '@nestjs/testing';
import { QrRepositoryAdapter } from './QrRepositoryAdapter';
import { MongoQrRepository } from '../repository/mongo/mongo-qr.repository';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import type { Qr } from '../../domain/entities/qr.entity';

describe('QrRepositoryAdapter', () => {
  let adapter: QrRepositoryAdapter;
  let mongoRepository: jest.Mocked<MongoQrRepository>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const qr: Qr = {
    id: 'qr-id-1',
    idQr: 'QR-1',
    userId: 'user-1',
    data: { typeQr: 'dynamic', url: 'https://ejemplo.cl' },
    name: 'Mi QR',
    active: true,
    typeQr: 'dynamic',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QrRepositoryAdapter,
        {
          provide: MongoQrRepository,
          useValue: {
            create: jest.fn(),
            getRecentActive: jest.fn(),
            getAll: jest.fn(),
            findAllWithSearch: jest.fn(),
            getById: jest.fn(),
            findByUserId: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findPaginatedByUser: jest.fn(),
            findUserByFavorites: jest.fn(),
          },
        },
      ],
    }).compile();

    adapter = module.get(QrRepositoryAdapter);
    mongoRepository = module.get(MongoQrRepository);
  });

  it('debe estar definido', () => {
    expect(adapter).toBeDefined();
  });

  describe('create', () => {
    it('debe delegar la creación al repositorio mongo', async () => {
      mongoRepository.create.mockResolvedValue(qr);

      const result = await adapter.create(qr, tracking);

      expect(mongoRepository.create).toHaveBeenCalledWith(qr, tracking);
      expect(result).toEqual(qr);
    });
  });

  describe('getRecentActive', () => {
    it('debe delegar la consulta de recientes activos al repositorio mongo', async () => {
      mongoRepository.getRecentActive.mockResolvedValue([qr]);

      const result = await adapter.getRecentActive(5, tracking);

      expect(mongoRepository.getRecentActive).toHaveBeenCalledWith(5, tracking);
      expect(result).toEqual([qr]);
    });
  });

  describe('getAll', () => {
    it('debe delegar la consulta de todos los QRs al repositorio mongo', async () => {
      mongoRepository.getAll.mockResolvedValue([qr]);

      const result = await adapter.getAll(tracking);

      expect(mongoRepository.getAll).toHaveBeenCalledWith(tracking);
      expect(result).toEqual([qr]);
    });
  });

  describe('findAllWithSearch', () => {
    it('debe delegar la búsqueda paginada al repositorio mongo', async () => {
      const response = {
        data: [qr],
        pagination: {
          total: 1,
          totalPages: 1,
          currentPage: 1,
          limit: 10,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
      mongoRepository.findAllWithSearch.mockResolvedValue(response);

      const result = await adapter.findAllWithSearch(1, 10, 'hola', tracking);

      expect(mongoRepository.findAllWithSearch).toHaveBeenCalledWith(1, 10, 'hola', tracking);
      expect(result).toEqual(response);
    });
  });

  describe('getById', () => {
    it('debe delegar la consulta por id al repositorio mongo', async () => {
      mongoRepository.getById.mockResolvedValue(qr);

      const result = await adapter.getById('QR-1', tracking);

      expect(mongoRepository.getById).toHaveBeenCalledWith('QR-1', tracking);
      expect(result).toEqual(qr);
    });

    it('debe retornar null cuando el repositorio no encuentra el QR', async () => {
      mongoRepository.getById.mockResolvedValue(null);

      const result = await adapter.getById('QR-inexistente', tracking);

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('debe delegar la consulta por usuario al repositorio mongo', async () => {
      mongoRepository.findByUserId.mockResolvedValue([qr]);

      const result = await adapter.findByUserId('user-1', tracking);

      expect(mongoRepository.findByUserId).toHaveBeenCalledWith('user-1', tracking);
      expect(result).toEqual([qr]);
    });
  });

  describe('update', () => {
    it('debe delegar la actualización al repositorio mongo', async () => {
      const updated = { ...qr, name: 'QR actualizado' };
      mongoRepository.update.mockResolvedValue(updated);

      const result = await adapter.update('QR-1', { name: 'QR actualizado' }, tracking);

      expect(mongoRepository.update).toHaveBeenCalledWith(
        'QR-1',
        { name: 'QR actualizado' },
        tracking,
      );
      expect(result).toEqual(updated);
    });

    it('debe retornar null cuando el repositorio no actualiza nada', async () => {
      mongoRepository.update.mockResolvedValue(null);

      const result = await adapter.update('QR-inexistente', { name: 'X' }, tracking);

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('debe delegar la eliminación al repositorio mongo y retornar true', async () => {
      mongoRepository.delete.mockResolvedValue(true);

      const result = await adapter.delete('QR-1', tracking);

      expect(mongoRepository.delete).toHaveBeenCalledWith('QR-1', tracking);
      expect(result).toBe(true);
    });

    it('debe retornar false cuando el repositorio no elimina nada', async () => {
      mongoRepository.delete.mockResolvedValue(false);

      const result = await adapter.delete('QR-inexistente', tracking);

      expect(result).toBe(false);
    });
  });

  describe('findPaginatedByUser', () => {
    it('debe delegar la búsqueda paginada por usuario al repositorio mongo', async () => {
      const response = {
        data: [qr],
        pagination: {
          total: 1,
          totalPages: 1,
          currentPage: 1,
          limit: 10,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
      mongoRepository.findPaginatedByUser.mockResolvedValue(response);

      const result = await adapter.findPaginatedByUser('user-1', 1, 10, 'hola', tracking);

      expect(mongoRepository.findPaginatedByUser).toHaveBeenCalledWith(
        'user-1',
        1,
        10,
        'hola',
        tracking,
      );
      expect(result).toEqual(response);
    });
  });

  describe('findUserByFavorites', () => {
    it('debe delegar la búsqueda por favoritos al repositorio mongo', async () => {
      const response = {
        data: [{ ...qr, resultType: 'qr' }],
        pagination: {
          total: 1,
          totalPages: 1,
          currentPage: '1',
          limit: '10',
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
      mongoRepository.findUserByFavorites.mockResolvedValue(response);

      const result = await adapter.findUserByFavorites(
        'user-1',
        1,
        10,
        'hola',
        'user',
        '',
        tracking,
      );

      expect(mongoRepository.findUserByFavorites).toHaveBeenCalledWith(
        'user-1',
        1,
        10,
        'hola',
        'user',
        '',
        tracking,
      );
      expect(result).toEqual(response);
    });
  });
});