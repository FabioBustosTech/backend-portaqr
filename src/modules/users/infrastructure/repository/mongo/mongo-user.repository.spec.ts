import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoUserRepository } from './mongo-user.repository';
import { UserSchema, UserDocument } from './schemas/user.schema';
import { TraceService, TraceLayer } from '../../../../../common/services/trace.service';
import type { TrackingContext } from '../../../../../common/decorators/tracking.decorator';
import type { User } from '../../../domain/entities/user.entity';

const mockFind = jest.fn();
const mockFindOne = jest.fn();
const mockFindById = jest.fn();
const mockCountDocuments = jest.fn();
const mockFindByIdAndUpdate = jest.fn();
const mockFindByIdAndDelete = jest.fn();
const mockSave = jest.fn();

const modelMock = jest.fn().mockImplementation((data: Record<string, unknown>) => ({
  ...data,
  save: mockSave,
})) as unknown as Model<UserDocument>;

(modelMock as unknown as Record<string, unknown>).find = mockFind;
(modelMock as unknown as Record<string, unknown>).findOne = mockFindOne;
(modelMock as unknown as Record<string, unknown>).findById = mockFindById;
(modelMock as unknown as Record<string, unknown>).countDocuments = mockCountDocuments;
(modelMock as unknown as Record<string, unknown>).findByIdAndUpdate = mockFindByIdAndUpdate;
(modelMock as unknown as Record<string, unknown>).findByIdAndDelete = mockFindByIdAndDelete;

/** Crea una query chainable de mongoose mockeada que resuelve execResult */
function mockQuery(execResult: unknown) {
  return {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(execResult),
  };
}

describe('MongoUserRepository', () => {
  let repository: MongoUserRepository;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const doc = {
    _id: { toString: () => 'user-id-1' },
    email: 'usuario@test.com',
    userName: 'usuario1',
    password: 'hash-1',
    firstName: 'Juan',
    paternalLastName: 'Pérez',
    maternalLastName: 'García',
    role: 'user',
    isEmailVerified: true,
    tokenVersion: 0,
    phone: '+56911111111',
    lastLogin: new Date('2024-08-01T12:00:00.000Z'),
    verificationCode: 'vc-1',
    verificationCodeExpires: new Date('2024-08-02T12:00:00.000Z'),
    passwordResetCode: 'prc-1',
    passwordResetExpires: new Date('2024-08-03T12:00:00.000Z'),
        verificationAttempts: 0,
        passwordResetAttempts: 0,
    createdAt: new Date('2024-08-01T10:00:00.000Z'),
    updatedAt: new Date('2024-08-01T11:00:00.000Z'),
  };

  const user: User = {
    id: 'user-id-1',
    email: 'usuario@test.com',
    userName: 'usuario1',
    password: 'hash-1',
    firstName: 'Juan',
    paternalLastName: 'Pérez',
    maternalLastName: 'García',
    role: 'user',
    isEmailVerified: true,
    tokenVersion: 0,
    phone: '+56911111111',
    lastLogin: doc.lastLogin,
    verificationCode: 'vc-1',
    verificationCodeExpires: doc.verificationCodeExpires,
    verificationAttempts: 0,
    passwordResetCode: 'prc-1',
    passwordResetExpires: doc.passwordResetExpires,
    passwordResetAttempts: 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongoUserRepository,
        {
          provide: getModelToken(UserSchema.name),
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

    repository = module.get(MongoUserRepository);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(repository).toBeDefined();
  });

  describe('getAll', () => {
    it('debe devolver usuarios paginados aplicando el filtro de rol y búsqueda', async () => {
      mockFind.mockReturnValue(mockQuery([doc]));
      mockCountDocuments.mockResolvedValue(1);

      const result = await repository.getAll(1, 10, 'usuario', 'user', tracking);

      expect(mockFind).toHaveBeenCalledWith({
        role: 'user',
        $or: [
          { userName: { $regex: 'usuario', $options: 'i' } },
          { email: { $regex: 'usuario', $options: 'i' } },
        ],
      });
      expect(mockCountDocuments).toHaveBeenCalledWith({
        role: 'user',
        $or: [
          { userName: { $regex: 'usuario', $options: 'i' } },
          { email: { $regex: 'usuario', $options: 'i' } },
        ],
      });
      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getAll:init',
        { page: 1, limit: 10, search: 'usuario', role: 'user' },
      );
      expect(result).toEqual({
        data: [user],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
    });

    it('debe filtrar por role=admin cuando se solicita (SPEC-013 Bloque C)', async () => {
      mockFind.mockReturnValue(mockQuery([doc]));
      mockCountDocuments.mockResolvedValue(1);

      await repository.getAll(1, 10, undefined, 'admin', tracking);

      expect(mockFind).toHaveBeenCalledWith({ role: 'admin' });
      expect(mockCountDocuments).toHaveBeenCalledWith({ role: 'admin' });
    });

    it('debe combinar role=admin con la búsqueda (SPEC-013 Bloque C)', async () => {
      mockFind.mockReturnValue(mockQuery([]));
      mockCountDocuments.mockResolvedValue(0);

      await repository.getAll(1, 10, 'fabio', 'admin', tracking);

      expect(mockFind).toHaveBeenCalledWith({
        role: 'admin',
        $or: [
          { userName: { $regex: 'fabio', $options: 'i' } },
          { email: { $regex: 'fabio', $options: 'i' } },
        ],
      });
    });

    it('debe listar TODOS los roles cuando role es "all" (SPEC-013 Bloque C — default)', async () => {
      mockFind.mockReturnValue(mockQuery([doc]));
      mockCountDocuments.mockResolvedValue(1);

      const result = await repository.getAll(1, 10, undefined, 'all', tracking);

      expect(mockFind).toHaveBeenCalledWith({});
      expect(mockCountDocuments).toHaveBeenCalledWith({});
      expect(result.total).toBe(1);
    });

    it('debe listar TODOS los roles cuando role no viene (default — SPEC-013 Bloque C)', async () => {
      mockFind.mockReturnValue(mockQuery([]));
      mockCountDocuments.mockResolvedValue(0);

      await repository.getAll(1, 10, undefined, undefined, tracking);

      expect(mockFind).toHaveBeenCalledWith({});
      expect(mockCountDocuments).toHaveBeenCalledWith({});
      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getAll:init',
        { page: 1, limit: 10, search: undefined, role: 'all' },
      );
    });

    it('debe listar TODOS los roles cuando role es inválido (whitelist — SPEC-013 Bloque C)', async () => {
      mockFind.mockReturnValue(mockQuery([]));
      mockCountDocuments.mockResolvedValue(0);

      await repository.getAll(1, 10, undefined, 'root', tracking);

      expect(mockFind).toHaveBeenCalledWith({});
      expect(mockCountDocuments).toHaveBeenCalledWith({});
    });

    it('debe escapar metacaracteres del término de búsqueda (SPEC-008 H3 — R2 ReDoS, CA-02)', async () => {
      mockFind.mockReturnValue(mockQuery([]));
      mockCountDocuments.mockResolvedValue(0);

      // (a+)+$ con backtracking exponencial → debe llegar a $regex como literal
      await repository.getAll(1, 10, '(a+)+$', 'user', tracking);

      const escaped = '\\(a\\+\\)\\+\\$';
      expect(mockFind).toHaveBeenCalledWith({
        role: 'user',
        $or: [
          { userName: { $regex: escaped, $options: 'i' } },
          { email: { $regex: escaped, $options: 'i' } },
        ],
      });
    });

    it('debe consultar solo por rol cuando no hay búsqueda', async () => {
      mockFind.mockReturnValue(mockQuery([]));
      mockCountDocuments.mockResolvedValue(0);
      await repository.getAll(1, 10, undefined, 'user', tracking);

      expect(mockFind).toHaveBeenCalledWith({ role: 'user' });
      expect(mockCountDocuments).toHaveBeenCalledWith({ role: 'user' });
    });

    it('debe calcular totalPages, hasNextPage y hasPrevPage correctamente', async () => {
      mockFind.mockReturnValue(mockQuery([doc]));
      mockCountDocuments.mockResolvedValue(25);

      const result = await repository.getAll(2, 10, undefined, 'user', tracking);

      expect(result.totalPages).toBe(3);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPrevPage).toBe(true);
    });

    it('debe trazar y re-lanzar el error si la consulta falla', async () => {
      mockFind.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('DB down')),
      });

      await expect(repository.getAll(1, 10, undefined, 'user', tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getAll:error',
        expect.any(Error),
      );
    });
  });

  describe('getById', () => {
    it('debe retornar la entidad mapeada cuando encuentra el documento', async () => {
      mockFindById.mockReturnValue(mockQuery(doc));

      const result = await repository.getById('user-id-1', tracking);

      expect(mockFindById).toHaveBeenCalledWith('user-id-1');
      expect(result).toEqual(user);
    });

    it('debe retornar null cuando no encuentra el documento', async () => {
      mockFindById.mockReturnValue(mockQuery(null));

      const result = await repository.getById('user-inexistente', tracking);

      expect(result).toBeNull();
    });

    it('debe trazar y re-lanzar el error si la consulta falla', async () => {
      mockFindById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('DB down')),
      });

      await expect(repository.getById('user-id-1', tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getById:error',
        expect.any(Error),
      );
    });
  });

  describe('getByEmail', () => {
    it('debe retornar la entidad mapeada cuando encuentra el documento', async () => {
      mockFindOne.mockReturnValue(mockQuery(doc));

      const result = await repository.getByEmail('usuario@test.com', tracking);

      expect(mockFindOne).toHaveBeenCalledWith({ email: 'usuario@test.com' });
      expect(result).toEqual(user);
    });

    it('debe retornar null cuando no encuentra el documento', async () => {
      mockFindOne.mockReturnValue(mockQuery(null));

      const result = await repository.getByEmail('no@existe.com', tracking);

      expect(result).toBeNull();
    });

    it('debe trazar y re-lanzar el error si la consulta falla', async () => {
      mockFindOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('DB down')),
      });

      await expect(repository.getByEmail('usuario@test.com', tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getByEmail:error',
        expect.any(Error),
      );
    });
  });

  describe('getByUsername', () => {
    it('debe buscar por email normalizado o nombre de usuario', async () => {
      mockFindOne.mockReturnValue(mockQuery(doc));

      const result = await repository.getByUsername('Usuario1', tracking);

      expect(mockFindOne).toHaveBeenCalledWith({
        $or: [
          { email: 'usuario1' },
          { userName: 'Usuario1' },
        ],
      });
      expect(result).toEqual(user);
    });

    it('debe retornar null cuando no encuentra el documento', async () => {
      mockFindOne.mockReturnValue(mockQuery(null));

      const result = await repository.getByUsername('desconocido', tracking);

      expect(result).toBeNull();
    });

    it('debe trazar y re-lanzar el error si la consulta falla', async () => {
      mockFindOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('DB down')),
      });

      await expect(repository.getByUsername('usuario1', tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getByUsername:error',
        expect.any(Error),
      );
    });
  });

  describe('getByVerificationCode', () => {
    it('debe retornar la entidad mapeada cuando encuentra el código', async () => {
      mockFindOne.mockReturnValue(mockQuery(doc));

      const result = await repository.getByVerificationCode('vc-1', tracking);

      expect(mockFindOne).toHaveBeenCalledWith({ verificationCode: 'vc-1' });
      expect(result).toEqual(user);
    });

    it('debe retornar null cuando no encuentra el código', async () => {
      mockFindOne.mockReturnValue(mockQuery(null));

      const result = await repository.getByVerificationCode('vc-invalido', tracking);

      expect(result).toBeNull();
    });

    it('debe trazar y re-lanzar el error si la consulta falla', async () => {
      mockFindOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('DB down')),
      });

      await expect(repository.getByVerificationCode('vc-1', tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getByVerificationCode:error',
        expect.any(Error),
      );
    });
  });

  describe('getByPasswordResetCode', () => {
    it('debe retornar la entidad mapeada cuando encuentra el código', async () => {
      mockFindOne.mockReturnValue(mockQuery(doc));

      const result = await repository.getByPasswordResetCode('prc-1', tracking);

      expect(mockFindOne).toHaveBeenCalledWith({ passwordResetCode: 'prc-1' });
      expect(result).toEqual(user);
    });

    it('debe retornar null cuando no encuentra el código', async () => {
      mockFindOne.mockReturnValue(mockQuery(null));

      const result = await repository.getByPasswordResetCode('prc-invalido', tracking);

      expect(result).toBeNull();
    });

    it('debe trazar y re-lanzar el error si la consulta falla', async () => {
      mockFindOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('DB down')),
      });

      await expect(repository.getByPasswordResetCode('prc-1', tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'getByPasswordResetCode:error',
        expect.any(Error),
      );
    });
  });

  describe('create', () => {
    it('debe crear el documento con el mapper y retornar la entidad mapeada', async () => {
      mockSave.mockResolvedValue(doc);

      const result = await repository.create(user, tracking);

      expect(modelMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'usuario@test.com',
          userName: 'usuario1',
          firstName: 'Juan',
          role: 'user',
          isEmailVerified: true,
        }),
      );
      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(result).toEqual(user);
    });

    it('debe trazar y re-lanzar el error si el guardado falla', async () => {
      mockSave.mockRejectedValue(new Error('DB down'));

      await expect(repository.create(user, tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'create:error',
        expect.any(Error),
      );
    });
  });

  describe('createAdmin', () => {
    it('debe crear el documento forzando el rol admin y retornar la entidad mapeada', async () => {
      const adminDoc = { ...doc, role: 'admin' };
      mockSave.mockResolvedValue(adminDoc);

      const result = await repository.createAdmin(user, tracking);

      expect(modelMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'usuario@test.com',
          userName: 'usuario1',
          role: 'admin',
        }),
      );
      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ ...user, role: 'admin' });
    });

    it('debe trazar y re-lanzar el error si el guardado falla', async () => {
      mockSave.mockRejectedValue(new Error('DB down'));

      await expect(repository.createAdmin(user, tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'createAdmin:error',
        expect.any(Error),
      );
    });
  });

  describe('update', () => {
    it('debe actualizar con $set y retornar la entidad mapeada', async () => {
      const updatedDoc = { ...doc, firstName: 'Pedro' };
      mockFindByIdAndUpdate.mockReturnValue(mockQuery(updatedDoc));

      const result = await repository.update(
        'user-id-1',
        { firstName: 'Pedro' },
        tracking,
      );

      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        'user-id-1',
        { $set: expect.objectContaining({ firstName: 'Pedro' }) },
        { new: true },
      );
      expect(result).toEqual({ ...user, firstName: 'Pedro' });
    });

    it('debe retornar null cuando no encuentra el documento a actualizar', async () => {
      mockFindByIdAndUpdate.mockReturnValue(mockQuery(null));

      const result = await repository.update('user-inexistente', { firstName: 'X' }, tracking);

      expect(result).toBeNull();
    });

    it('debe trazar y re-lanzar el error si la actualización falla', async () => {
      mockFindByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('DB down')),
      });

      await expect(repository.update('user-id-1', { firstName: 'X' }, tracking)).rejects.toThrow(
        'DB down',
      );
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'update:error',
        expect.any(Error),
      );
    });
  });

  describe('updateLastLogin', () => {
    it('debe actualizar lastLogin con la fecha actual', async () => {
      mockFindByIdAndUpdate.mockReturnValue(mockQuery(doc));

      await repository.updateLastLogin('user-id-1', tracking);

      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        'user-id-1',
        { lastLogin: expect.any(Date) },
      );
    });

    it('debe trazar y re-lanzar el error si la actualización falla', async () => {
      mockFindByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DB down')),
      });

      await expect(repository.updateLastLogin('user-id-1', tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'updateLastLogin:error',
        expect.any(Error),
      );
    });
  });

  describe('delete', () => {
    it('debe retornar true cuando el documento fue eliminado', async () => {
      mockFindByIdAndDelete.mockReturnValue(mockQuery(doc));

      const result = await repository.delete('user-id-1', tracking);

      expect(mockFindByIdAndDelete).toHaveBeenCalledWith('user-id-1');
      expect(result).toBe(true);
    });

    it('debe retornar false cuando no existe el documento', async () => {
      mockFindByIdAndDelete.mockReturnValue(mockQuery(null));

      const result = await repository.delete('user-inexistente', tracking);

      expect(result).toBe(false);
    });

    it('debe trazar y re-lanzar el error si la eliminación falla', async () => {
      mockFindByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DB down')),
      });

      await expect(repository.delete('user-id-1', tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'delete:error',
        expect.any(Error),
      );
    });
  });

  describe('checkUserNameExists', () => {
    it('debe retornar true cuando el nombre de usuario existe', async () => {
      mockFindOne.mockReturnValue(mockQuery(doc));

      const result = await repository.checkUserNameExists('usuario1', tracking);

      expect(mockFindOne).toHaveBeenCalledWith({ userName: 'usuario1' });
      expect(result).toBe(true);
    });

    it('debe retornar false cuando el nombre de usuario no existe', async () => {
      mockFindOne.mockReturnValue(mockQuery(null));

      const result = await repository.checkUserNameExists('desconocido', tracking);

      expect(result).toBe(false);
    });

    it('debe trazar y re-lanzar el error si la consulta falla', async () => {
      mockFindOne.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DB down')),
      });

      await expect(repository.checkUserNameExists('usuario1', tracking)).rejects.toThrow('DB down');
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'checkUserNameExists:error',
        expect.any(Error),
      );
    });
  });

  describe('checkEmailExists', () => {
    it('debe retornar true cuando el email existe', async () => {
      mockFindOne.mockReturnValue(mockQuery(doc));

      const result = await repository.checkEmailExists('usuario@test.com', tracking);

      expect(mockFindOne).toHaveBeenCalledWith({ email: 'usuario@test.com' });
      expect(result).toBe(true);
    });

    it('debe retornar false cuando el email no existe', async () => {
      mockFindOne.mockReturnValue(mockQuery(null));

      const result = await repository.checkEmailExists('no@existe.com', tracking);

      expect(result).toBe(false);
    });

    it('debe trazar y re-lanzar el error si la consulta falla', async () => {
      mockFindOne.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('DB down')),
      });

      await expect(repository.checkEmailExists('usuario@test.com', tracking)).rejects.toThrow(
        'DB down',
      );
      expect(traceService.error).toHaveBeenCalledWith(
        tracking,
        TraceLayer.REPOSITORY,
        'checkEmailExists:error',
        expect.any(Error),
      );
    });
  });
});
