import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { QrController } from './qr.controller';
import { CreateQrUseCase } from '../../application/use-cases/create-qr.usecase';
import { GetAllQrUseCase } from '../../application/use-cases/get-all-qr.usecase';
import { GetQrUseCase } from '../../application/use-cases/get-qr.usecase';
import { GetQrsByUserUseCase } from '../../application/use-cases/get-qrs-by-user.usecase';
import { GetPaginatedQrsByUserUseCase } from '../../application/use-cases/get-paginated-qrs-by-user.usecase';
import { GetFavoritesQrsUseCase } from '../../application/use-cases/get-favorites-qrs.usecase';
import { GetRecentActiveQrUseCase } from '../../application/use-cases/get-recent-active-qr.usecase';
import { GetPublicQrUseCase } from '../../application/use-cases/get-public-qr.usecase';
import { UpdateQrUseCase } from '../../application/use-cases/update-qr.usecase';
import { DeleteQrUseCase } from '../../application/use-cases/delete-qr.usecase';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import type { User } from 'src/modules/users/domain/entities/user.entity';
import type { Qr } from '../../domain/entities/qr.entity';
import type { QrPagination } from '../../domain/ports/queries/qr.port';
import { CreateQrDto, QrType } from '../../application/dto/create-qr.dto';

describe('QrController', () => {
  let controller: QrController;
  let createQrUseCase: jest.Mocked<CreateQrUseCase>;
  let getAllQrUseCase: jest.Mocked<GetAllQrUseCase>;
  let getQrUseCase: jest.Mocked<GetQrUseCase>;
  let getQrsByUserUseCase: jest.Mocked<GetQrsByUserUseCase>;
  let getPaginatedQrsByUserUseCase: jest.Mocked<GetPaginatedQrsByUserUseCase>;
  let getFavoritesQrsUseCase: jest.Mocked<GetFavoritesQrsUseCase>;
  let getRecentActiveQrUseCase: jest.Mocked<GetRecentActiveQrUseCase>;
  let getPublicQrUseCase: jest.Mocked<GetPublicQrUseCase>;
  let updateQrUseCase: jest.Mocked<UpdateQrUseCase>;
  let deleteQrUseCase: jest.Mocked<DeleteQrUseCase>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const mockUser: User = {
    id: 'user-1',
    email: 'user@test.com',
    userName: 'testuser',
    firstName: 'Test',
    paternalLastName: 'Apellido',
    maternalLastName: 'Apellido2',
    role: 'user',
    isEmailVerified: true,
  };

  const mockAdmin: User = {
    ...mockUser,
    id: 'admin-1',
    role: 'admin',
  };

  const mockQr: Qr = {
    id: 'qr-id-1',
    idQr: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'user-1',
    name: 'QR de prueba',
    description: 'Descripción de prueba',
    active: true,
    isFavorite: false,
    isOldMode: false,
    typeQr: 'dynamic',
    data: { typeQr: 'dynamic', url: 'https://example.com' },
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z'),
  };

  const mockPagination: QrPagination = {
    total: 1,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false,
  };

  const createDto: CreateQrDto = {
    idQr: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'user-1',
    name: 'QR de prueba',
    typeQr: QrType.DYNAMIC,
    data: { typeQr: QrType.DYNAMIC, url: 'https://example.com' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QrController],
      providers: [
        {
          provide: CreateQrUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetAllQrUseCase,
          useValue: { execute: jest.fn(), executeAll: jest.fn() },
        },
        {
          provide: GetQrUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetQrsByUserUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetPaginatedQrsByUserUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetFavoritesQrsUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetRecentActiveQrUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetPublicQrUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: UpdateQrUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: DeleteQrUseCase,
          useValue: { execute: jest.fn() },
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

    controller = module.get(QrController);
    createQrUseCase = module.get(CreateQrUseCase);
    getAllQrUseCase = module.get(GetAllQrUseCase);
    getQrUseCase = module.get(GetQrUseCase);
    getQrsByUserUseCase = module.get(GetQrsByUserUseCase);
    getPaginatedQrsByUserUseCase = module.get(GetPaginatedQrsByUserUseCase);
    getFavoritesQrsUseCase = module.get(GetFavoritesQrsUseCase);
    getRecentActiveQrUseCase = module.get(GetRecentActiveQrUseCase);
    getPublicQrUseCase = module.get(GetPublicQrUseCase);
    updateQrUseCase = module.get(UpdateQrUseCase);
    deleteQrUseCase = module.get(DeleteQrUseCase);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('create (POST /qr)', () => {
    it('debe crear un QR cuando el usuario es propietario', async () => {
      createQrUseCase.execute.mockResolvedValue(mockQr);

      const result = await controller.create(createDto, mockUser, tracking);

      expect(createQrUseCase.execute).toHaveBeenCalledWith(createDto, tracking);
      expect(result).toEqual(mockQr);
    });

    it('debe permitir a un admin crear QRs para cualquier usuario', async () => {
      const dtoAdmin = { ...createDto, userId: 'otro-usuario' };
      createQrUseCase.execute.mockResolvedValue({ ...mockQr, userId: 'otro-usuario' });

      const result = await controller.create(dtoAdmin, mockAdmin, tracking);

      expect(createQrUseCase.execute).toHaveBeenCalledWith(dtoAdmin, tracking);
      expect(result.userId).toBe('otro-usuario');
    });

    it('debe lanzar ForbiddenException si un usuario normal crea un QR para otro usuario', async () => {
      const dtoAjeno = { ...createDto, userId: 'otro-usuario' };

      await expect(
        controller.create(dtoAjeno, mockUser, tracking),
      ).rejects.toThrow(ForbiddenException);
      expect(createQrUseCase.execute).not.toHaveBeenCalled();
      expect(traceService.warn).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'POST /qr - forbidden owner',
        expect.any(Object),
      );
    });

    it('debe registrar el evento en el TraceService', async () => {
      createQrUseCase.execute.mockResolvedValue(mockQr);

      await controller.create(createDto, mockUser, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'POST /qr',
        { userId: createDto.userId, idQr: createDto.idQr },
      );
    });
  });

  describe('getSeoQrs (GET /qr/seo-idqr)', () => {
    it('debe retornar los QRs activos recientes con formato SEO', async () => {
      getRecentActiveQrUseCase.execute.mockResolvedValue([mockQr]);

      const result = await controller.getSeoQrs(tracking);

      expect(getRecentActiveQrUseCase.execute).toHaveBeenCalledWith(500, tracking);
      expect(result).toEqual([
        { id: mockQr.idQr, updatedAt: mockQr.updatedAt },
      ]);
    });

    it('debe retornar una lista vacía cuando no hay QRs activos', async () => {
      getRecentActiveQrUseCase.execute.mockResolvedValue([]);

      const result = await controller.getSeoQrs(tracking);

      expect(result).toEqual([]);
      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'GET /qr/seo-idqr - complete',
        { total: 0 },
      );
    });
  });

  describe('findAll (GET /qr)', () => {
    it('debe retornar los QRs paginados delegando los parámetros', async () => {
      getAllQrUseCase.execute.mockResolvedValue({
        data: [mockQr],
        pagination: mockPagination,
      });

      const result = await controller.findAll(2, 5, 'busqueda', tracking);

      expect(getAllQrUseCase.execute).toHaveBeenCalledWith(
        2,
        5,
        'busqueda',
        tracking,
      );
      expect(result.data).toEqual([mockQr]);
      expect(result.pagination).toEqual(mockPagination);
    });

    it('debe aplicar valores por defecto cuando no se envían parámetros', async () => {
      getAllQrUseCase.execute.mockResolvedValue({
        data: [],
        pagination: mockPagination,
      });

      await controller.findAll(
        undefined as unknown as number,
        undefined as unknown as number,
        undefined as unknown as string,
        tracking,
      );

      expect(getAllQrUseCase.execute).toHaveBeenCalledWith(1, 10, '', tracking);
    });
  });

  describe('findOne (GET /qr/:id)', () => {
    it('debe retornar el QR cuando el usuario es el propietario', async () => {
      getQrUseCase.execute.mockResolvedValue(mockQr);

      const result = await controller.findOne('qr-id-1', mockUser, tracking);

      expect(getQrUseCase.execute).toHaveBeenCalledWith('qr-id-1', tracking);
      expect(result).toEqual(mockQr);
    });

    it('debe permitir a un admin ver QRs de cualquier usuario', async () => {
      getQrUseCase.execute.mockResolvedValue(mockQr);

      const result = await controller.findOne('qr-id-1', mockAdmin, tracking);

      expect(result).toEqual(mockQr);
    });

    it('debe lanzar ForbiddenException si un usuario normal ve un QR ajeno', async () => {
      getQrUseCase.execute.mockResolvedValue({ ...mockQr, userId: 'otro-usuario' });

      await expect(
        controller.findOne('qr-id-1', mockUser, tracking),
      ).rejects.toThrow(ForbiddenException);
      expect(traceService.warn).toHaveBeenCalledWith(
        tracking,
        TraceLayer.CONTROLLER,
        'GET /qr/:id - forbidden owner',
        expect.any(Object),
      );
    });

    it('debe propagar NotFoundException si el QR no existe', async () => {
      getQrUseCase.execute.mockRejectedValue(new NotFoundException());

      await expect(
        controller.findOne('qr-id-1', mockUser, tracking),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findUserByFavorites (GET /qr/user/favorites)', () => {
    it('debe usar el id del usuario actual como destino para un usuario normal', async () => {
      getFavoritesQrsUseCase.execute.mockResolvedValue({
        data: [mockQr],
        pagination: mockPagination,
      });

      const result = await controller.findUserByFavorites(
        1,
        10,
        '',
        '',
        mockUser,
        tracking,
      );

      expect(getFavoritesQrsUseCase.execute).toHaveBeenCalledWith(
        mockUser.id,
        1,
        10,
        '',
        mockUser.role,
        mockUser.id,
        tracking,
      );
      expect(result.data).toEqual([mockQr]);
    });

    it('debe usar el userId del query como destino para un admin', async () => {
      getFavoritesQrsUseCase.execute.mockResolvedValue({
        data: [],
        pagination: mockPagination,
      });

      await controller.findUserByFavorites(
        1,
        10,
        '',
        'otro-usuario',
        mockAdmin,
        tracking,
      );

      expect(getFavoritesQrsUseCase.execute).toHaveBeenCalledWith(
        mockAdmin.id,
        1,
        10,
        '',
        mockAdmin.role,
        'otro-usuario',
        tracking,
      );
    });
  });

  describe('findByUserId (GET /qr/user/:userId)', () => {
    it('debe retornar los QRs del usuario cuando es el propietario', async () => {
      getQrsByUserUseCase.execute.mockResolvedValue([mockQr]);

      const result = await controller.findByUserId('user-1', mockUser, tracking);

      expect(getQrsByUserUseCase.execute).toHaveBeenCalledWith('user-1', tracking);
      expect(result).toEqual([mockQr]);
    });

    it('debe permitir a un admin consultar los QRs de cualquier usuario', async () => {
      getQrsByUserUseCase.execute.mockResolvedValue([]);

      const result = await controller.findByUserId(
        'otro-usuario',
        mockAdmin,
        tracking,
      );

      expect(result).toEqual([]);
    });

    it('debe lanzar ForbiddenException si un usuario normal consulta otro userId', async () => {
      await expect(
        controller.findByUserId('otro-usuario', mockUser, tracking),
      ).rejects.toThrow(ForbiddenException);
      expect(getQrsByUserUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('update (PATCH /qr/:id)', () => {
    it('debe actualizar el QR cuando el usuario es el propietario', async () => {
      getQrUseCase.execute.mockResolvedValue(mockQr);
      updateQrUseCase.execute.mockResolvedValue({ ...mockQr, name: 'Nuevo' });
      const dto = { name: 'Nuevo' };

      const result = await controller.update('qr-id-1', dto, mockUser, tracking);

      expect(updateQrUseCase.execute).toHaveBeenCalledWith('qr-id-1', dto, tracking);
      expect(result.name).toBe('Nuevo');
    });

    it('debe permitir a un admin actualizar QRs de cualquier usuario', async () => {
      getQrUseCase.execute.mockResolvedValue(mockQr);
      updateQrUseCase.execute.mockResolvedValue(mockQr);
      const dto = { name: 'Nuevo', userId: 'otro-usuario' };

      const result = await controller.update('qr-id-1', dto, mockAdmin, tracking);

      expect(result).toEqual(mockQr);
    });

    it('debe lanzar ForbiddenException si un usuario normal actualiza un QR ajeno', async () => {
      getQrUseCase.execute.mockResolvedValue({ ...mockQr, userId: 'otro-usuario' });

      await expect(
        controller.update('qr-id-1', { name: 'Nuevo' }, mockUser, tracking),
      ).rejects.toThrow(ForbiddenException);
      expect(updateQrUseCase.execute).not.toHaveBeenCalled();
    });

    it('debe lanzar ForbiddenException si un usuario normal intenta cambiar el propietario', async () => {
      getQrUseCase.execute.mockResolvedValue(mockQr);

      await expect(
        controller.update('qr-id-1', { userId: 'otro-usuario' }, mockUser, tracking),
      ).rejects.toThrow(ForbiddenException);
      expect(updateQrUseCase.execute).not.toHaveBeenCalled();
    });

    it('debe permitir a un usuario normal incluir su propio userId en la actualización', async () => {
      getQrUseCase.execute.mockResolvedValue(mockQr);
      updateQrUseCase.execute.mockResolvedValue(mockQr);
      const dto = { userId: 'user-1' };

      const result = await controller.update('qr-id-1', dto, mockUser, tracking);

      expect(updateQrUseCase.execute).toHaveBeenCalledWith('qr-id-1', dto, tracking);
      expect(result).toEqual(mockQr);
    });

    it('debe propagar NotFoundException si el QR no existe', async () => {
      getQrUseCase.execute.mockRejectedValue(new NotFoundException());

      await expect(
        controller.update('qr-id-1', { name: 'Nuevo' }, mockUser, tracking),
      ).rejects.toThrow(NotFoundException);
      expect(updateQrUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('remove (DELETE /qr/:id)', () => {
    it('debe eliminar el QR cuando el usuario es el propietario', async () => {
      getQrUseCase.execute.mockResolvedValue(mockQr);
      deleteQrUseCase.execute.mockResolvedValue();

      const result = await controller.remove('qr-id-1', mockUser, tracking);

      expect(deleteQrUseCase.execute).toHaveBeenCalledWith('qr-id-1', tracking);
      expect(result).toEqual({ message: 'QR eliminado exitosamente' });
    });

    it('debe lanzar ForbiddenException si un usuario normal elimina un QR ajeno', async () => {
      getQrUseCase.execute.mockResolvedValue({ ...mockQr, userId: 'otro-usuario' });

      await expect(
        controller.remove('qr-id-1', mockUser, tracking),
      ).rejects.toThrow(ForbiddenException);
      expect(deleteQrUseCase.execute).not.toHaveBeenCalled();
    });

    it('debe propagar NotFoundException si el QR no existe', async () => {
      getQrUseCase.execute.mockRejectedValue(new NotFoundException());

      await expect(
        controller.remove('qr-id-1', mockUser, tracking),
      ).rejects.toThrow(NotFoundException);
      expect(deleteQrUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('findPaginatedByUser (GET /qr/user/:userId/paginated)', () => {
    it('debe retornar los QRs paginados del usuario propietario', async () => {
      getPaginatedQrsByUserUseCase.execute.mockResolvedValue({
        data: [mockQr],
        pagination: mockPagination,
      });

      const result = await controller.findPaginatedByUser(
        'user-1',
        2,
        5,
        'busqueda',
        mockUser,
        tracking,
      );

      expect(getPaginatedQrsByUserUseCase.execute).toHaveBeenCalledWith(
        'user-1',
        2,
        5,
        'busqueda',
        tracking,
      );
      expect(result.data).toEqual([mockQr]);
    });

    it('debe permitir a un admin consultar cualquier usuario', async () => {
      getPaginatedQrsByUserUseCase.execute.mockResolvedValue({
        data: [],
        pagination: mockPagination,
      });

      const result = await controller.findPaginatedByUser(
        'otro-usuario',
        1,
        10,
        '',
        mockAdmin,
        tracking,
      );

      expect(result.data).toEqual([]);
    });

    it('debe lanzar ForbiddenException si un usuario normal consulta otro userId', async () => {
      await expect(
        controller.findPaginatedByUser(
          'otro-usuario',
          1,
          10,
          '',
          mockUser,
          tracking,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(getPaginatedQrsByUserUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('getPublicRedirectUrl (GET /qr/public/:id)', () => {
    it('debe retornar la redirección del QR público', async () => {
      const publicQr = {
        data: mockQr.data,
        id: mockQr.userId,
        name: mockQr.name,
        description: mockQr.description,
      };
      getPublicQrUseCase.execute.mockResolvedValue(publicQr);

      const result = await controller.getPublicRedirectUrl('qr-id-1', tracking);

      expect(getPublicQrUseCase.execute).toHaveBeenCalledWith('qr-id-1', tracking);
      expect(result).toEqual(publicQr);
    });
  });
});