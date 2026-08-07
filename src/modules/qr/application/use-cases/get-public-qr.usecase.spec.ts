import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { GetPublicQrUseCase } from './get-public-qr.usecase';
import type { ICanGetQr } from '../../domain/ports/queries/qr.port';
import { QR_GET_PORT } from '../../domain/constants/qr.tokens';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import type { Qr } from '../../domain/entities/qr.entity';

describe('GetPublicQrUseCase', () => {
  let useCase: GetPublicQrUseCase;
  let reader: jest.Mocked<ICanGetQr>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };
  const id = 'qr-id-1';

  const mockQrActivo: Qr = {
    id,
    idQr: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'user-1',
    name: 'QR de prueba',
    description: 'Descripción de prueba',
    active: true,
    isFavorite: false,
    isOldMode: false,
    typeQr: 'dynamic',
    data: { typeQr: 'dynamic', url: 'https://example.com' },
  };

  const mockQrInactivo: Qr = { ...mockQrActivo, active: false };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetPublicQrUseCase,
        {
          provide: QR_GET_PORT,
          useValue: {
            getById: jest.fn(),
            getRecentActive: jest.fn(),
            findByUserId: jest.fn(),
            findPaginatedByUser: jest.fn(),
            findUserByFavorites: jest.fn(),
          },
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

    useCase = module.get(GetPublicQrUseCase);
    reader = module.get(QR_GET_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe retornar los datos públicos de redirección de un QR activo', async () => {
      reader.getById.mockResolvedValue(mockQrActivo);

      const result = await useCase.execute(id, tracking);

      expect(reader.getById).toHaveBeenCalledWith(id, tracking);
      expect(result).toEqual({
        data: mockQrActivo.data,
        name: mockQrActivo.name,
        id: mockQrActivo.userId,
        description: mockQrActivo.description,
      });
    });

    it('debe usar cadenas vacías como fallback cuando name/description no existen', async () => {
      const qrSinNombre = { ...mockQrActivo, name: undefined, description: undefined };
      reader.getById.mockResolvedValue(qrSinNombre);

      const result = await useCase.execute(id, tracking);

      expect(result.name).toBe('');
      expect(result.description).toBe('');
    });

    it('debe lanzar HttpException 404 si el QR no existe', async () => {
      reader.getById.mockResolvedValue(null);

      try {
        await useCase.execute(id, tracking);
        fail('debería haber lanzado HttpException');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.NOT_FOUND);
      }
      expect(traceService.warn).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'GetPublicQrUseCase - not found',
        { id },
      );
    });

    it('debe lanzar HttpException 404 si el QR está inactivo', async () => {
      reader.getById.mockResolvedValue(mockQrInactivo);

      try {
        await useCase.execute(id, tracking);
        fail('debería haber lanzado HttpException');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.NOT_FOUND);
      }
      expect(traceService.warn).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'GetPublicQrUseCase - inactive',
        { id },
      );
    });

    it('debe registrar el input en el TraceService', async () => {
      reader.getById.mockResolvedValue(mockQrActivo);

      await useCase.execute(id, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'GetPublicQrUseCase - input',
        { id },
      );
    });

    it('debe propagar errores del port', async () => {
      reader.getById.mockRejectedValue(new Error('DB down'));

      await expect(useCase.execute(id, tracking)).rejects.toThrow('DB down');
    });
  });
});