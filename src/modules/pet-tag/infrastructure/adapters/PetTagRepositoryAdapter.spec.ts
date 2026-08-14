import { Test, TestingModule } from '@nestjs/testing';
import { PetTagRepositoryAdapter } from './PetTagRepositoryAdapter';
import { MongoPetTagRepository } from '../repository/mongo/mongo-pet-tag.repository';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import type { PetData } from '../../domain/entities/pet-tag.entity';

describe('PetTagRepositoryAdapter', () => {
  let adapter: PetTagRepositoryAdapter;
  let mongoRepository: jest.Mocked<MongoPetTagRepository>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const petData: PetData = {
    ownerName: 'Juan',
    address: 'Calle 1',
    phone: '123',
    petName: 'Rex',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PetTagRepositoryAdapter,
        {
          provide: MongoPetTagRepository,
          useValue: {
            generateBatch: jest.fn(),
            findReserved: jest.fn(),
            getStatus: jest.fn(),
            getOwner: jest.fn(),
            update: jest.fn(),
            activate: jest.fn(),
            setPetImageUrl: jest.fn(),
          },
        },
      ],
    }).compile();

    adapter = module.get(PetTagRepositoryAdapter);
    mongoRepository = module.get(MongoPetTagRepository);
  });

  it('debe estar definido', () => {
    expect(adapter).toBeDefined();
  });

  describe('generateBatch', () => {
    it('debe delegar la generación de lote al repositorio mongo', async () => {
      const result = [{ qrId: 'qr-1', activationPin: 'PIN-1', assignedStoreName: null }];
      mongoRepository.generateBatch.mockResolvedValue(result);

      const res = await adapter.generateBatch(2, 'Tienda', tracking);

      expect(mongoRepository.generateBatch).toHaveBeenCalledWith(2, 'Tienda', tracking);
      expect(res).toEqual(result);
    });
  });

  describe('findReserved', () => {
    it('debe delegar la consulta de placas reservadas al repositorio mongo', async () => {
      const result = {
        data: [],
        pagination: { total: 0, page: 1, limit: 100, totalPages: 0 },
      };
      mongoRepository.findReserved.mockResolvedValue(result);

      const res = await adapter.findReserved({ page: 1 }, tracking);

      expect(mongoRepository.findReserved).toHaveBeenCalledWith({ page: 1 }, tracking);
      expect(res).toEqual(result);
    });
  });

  describe('getStatus', () => {
    it('debe delegar la consulta de estado al repositorio mongo', async () => {
      mongoRepository.getStatus.mockResolvedValue({ status: 'ACTIVO', petData });

      const res = await adapter.getStatus('qr-1', tracking);

      expect(mongoRepository.getStatus).toHaveBeenCalledWith('qr-1', tracking);
      expect(res).toEqual({ status: 'ACTIVO', petData });
    });

    it('debe retornar null cuando el repositorio no encuentra la placa', async () => {
      mongoRepository.getStatus.mockResolvedValue(null);

      const res = await adapter.getStatus('qr-inexistente', tracking);

      expect(res).toBeNull();
    });
  });

  describe('update', () => {
    it('debe delegar la actualización al repositorio mongo', async () => {
      const updated = { idQr: 'qr-1', name: 'Nuevo' };
      mongoRepository.update.mockResolvedValue(updated);

      const res = await adapter.update('qr-1', 'user-1', { name: 'Nuevo' }, tracking);

      expect(mongoRepository.update).toHaveBeenCalledWith(
        'qr-1',
        'user-1',
        { name: 'Nuevo' },
        tracking,
      );
      expect(res).toEqual(updated);
    });
  });

  describe('activate', () => {
    it('debe delegar la activaciÃ³n al repositorio mongo', async () => {
      const activated = { idQr: 'qr-1', status: 'ACTIVO' };
      mongoRepository.activate.mockResolvedValue(activated);

      const res = await adapter.activate('qr-1', 'PIN-1', petData, 'user-1', tracking);

      expect(mongoRepository.activate).toHaveBeenCalledWith(
        'qr-1',
        'PIN-1',
        petData,
        'user-1',
        tracking,
      );
      expect(res).toEqual(activated);
    });
  });

  describe('getOwner (SPEC-016)', () => {
    it('debe delegar la consulta de dueño al repositorio mongo', async () => {
      mongoRepository.getOwner.mockResolvedValue({ userId: 'user-1' });

      const res = await adapter.getOwner('qr-1', tracking);

      expect(mongoRepository.getOwner).toHaveBeenCalledWith('qr-1', tracking);
      expect(res).toEqual({ userId: 'user-1' });
    });
  });

  describe('setPetImageUrl (SPEC-016)', () => {
    it('debe delegar la persistencia de la foto al repositorio mongo', async () => {
      mongoRepository.setPetImageUrl.mockResolvedValue({ idQr: 'qr-1' });

      const res = await adapter.setPetImageUrl('qr-1', 'user-1', 'https://cdn/x.webp', tracking);

      expect(mongoRepository.setPetImageUrl).toHaveBeenCalledWith(
        'qr-1',
        'user-1',
        'https://cdn/x.webp',
        tracking,
      );
      expect(res).toEqual({ idQr: 'qr-1' });
    });

    it('debe aceptar userId null (admin) y url null (borrado)', async () => {
      mongoRepository.setPetImageUrl.mockResolvedValue({ idQr: 'qr-1' });

      await adapter.setPetImageUrl('qr-1', null, null, tracking);

      expect(mongoRepository.setPetImageUrl).toHaveBeenCalledWith('qr-1', null, null, tracking);
    });
  });
});