import { Test, TestingModule } from '@nestjs/testing';
import { UserRepositoryAdapter } from './UserRepositoryAdapter';
import { MongoUserRepository } from '../repository/mongo/mongo-user.repository';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import type { User } from '../../domain/entities/user.entity';

describe('UserRepositoryAdapter', () => {
  let adapter: UserRepositoryAdapter;
  let mongoRepository: jest.Mocked<MongoUserRepository>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

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
  };

  const paginated = {
    data: [user],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepositoryAdapter,
        {
          provide: MongoUserRepository,
          useValue: {
            getAll: jest.fn(),
            getById: jest.fn(),
            getByEmail: jest.fn(),
            getByUsername: jest.fn(),
            getByVerificationCode: jest.fn(),
            getByPasswordResetCode: jest.fn(),
            create: jest.fn(),
            createAdmin: jest.fn(),
            update: jest.fn(),
            updateLastLogin: jest.fn(),
            delete: jest.fn(),
            checkUserNameExists: jest.fn(),
            checkEmailExists: jest.fn(),
          },
        },
      ],
    }).compile();

    adapter = module.get(UserRepositoryAdapter);
    mongoRepository = module.get(MongoUserRepository);
  });

  it('debe estar definido', () => {
    expect(adapter).toBeDefined();
  });

  describe('getAll', () => {
    it('debe delegar la consulta paginada al repositorio mongo (incluyendo rol — SPEC-013 Bloque C)', async () => {
      mongoRepository.getAll.mockResolvedValue(paginated);

      const result = await adapter.getAll(1, 10, 'usuario', 'user', tracking);

      expect(mongoRepository.getAll).toHaveBeenCalledWith(1, 10, 'usuario', 'user', tracking);
      expect(result).toEqual(paginated);
    });

    it('debe delegar con rol undefined tal cual', async () => {
      mongoRepository.getAll.mockResolvedValue(paginated);

      await adapter.getAll(1, 10, undefined, undefined, tracking);

      expect(mongoRepository.getAll).toHaveBeenCalledWith(1, 10, undefined, undefined, tracking);
    });
  });

  describe('getById', () => {
    it('debe delegar la consulta por id al repositorio mongo', async () => {
      mongoRepository.getById.mockResolvedValue(user);

      const result = await adapter.getById('user-id-1', tracking);

      expect(mongoRepository.getById).toHaveBeenCalledWith('user-id-1', tracking);
      expect(result).toEqual(user);
    });

    it('debe retornar null cuando el repositorio no encuentra el usuario', async () => {
      mongoRepository.getById.mockResolvedValue(null);

      const result = await adapter.getById('user-inexistente', tracking);

      expect(result).toBeNull();
    });
  });

  describe('getByEmail', () => {
    it('debe delegar la consulta por email al repositorio mongo', async () => {
      mongoRepository.getByEmail.mockResolvedValue(user);

      const result = await adapter.getByEmail('usuario@test.com', tracking);

      expect(mongoRepository.getByEmail).toHaveBeenCalledWith('usuario@test.com', tracking);
      expect(result).toEqual(user);
    });

    it('debe retornar null cuando el repositorio no encuentra el email', async () => {
      mongoRepository.getByEmail.mockResolvedValue(null);

      const result = await adapter.getByEmail('no@existe.com', tracking);

      expect(result).toBeNull();
    });
  });

  describe('getByUsername', () => {
    it('debe delegar la consulta por username/email al repositorio mongo', async () => {
      mongoRepository.getByUsername.mockResolvedValue(user);

      const result = await adapter.getByUsername('usuario1', tracking);

      expect(mongoRepository.getByUsername).toHaveBeenCalledWith('usuario1', tracking);
      expect(result).toEqual(user);
    });

    it('debe retornar null cuando el repositorio no encuentra el usuario', async () => {
      mongoRepository.getByUsername.mockResolvedValue(null);

      const result = await adapter.getByUsername('desconocido', tracking);

      expect(result).toBeNull();
    });
  });

  describe('getByVerificationCode', () => {
    it('debe delegar la consulta por código de verificación al repositorio mongo', async () => {
      mongoRepository.getByVerificationCode.mockResolvedValue(user);

      const result = await adapter.getByVerificationCode('vc-1', tracking);

      expect(mongoRepository.getByVerificationCode).toHaveBeenCalledWith('vc-1', tracking);
      expect(result).toEqual(user);
    });

    it('debe retornar null cuando el repositorio no encuentra el código', async () => {
      mongoRepository.getByVerificationCode.mockResolvedValue(null);

      const result = await adapter.getByVerificationCode('vc-invalido', tracking);

      expect(result).toBeNull();
    });
  });

  describe('getByPasswordResetCode', () => {
    it('debe delegar la consulta por código de reset al repositorio mongo', async () => {
      mongoRepository.getByPasswordResetCode.mockResolvedValue(user);

      const result = await adapter.getByPasswordResetCode('prc-1', tracking);

      expect(mongoRepository.getByPasswordResetCode).toHaveBeenCalledWith('prc-1', tracking);
      expect(result).toEqual(user);
    });

    it('debe retornar null cuando el repositorio no encuentra el código', async () => {
      mongoRepository.getByPasswordResetCode.mockResolvedValue(null);

      const result = await adapter.getByPasswordResetCode('prc-invalido', tracking);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('debe delegar la creación al repositorio mongo', async () => {
      mongoRepository.create.mockResolvedValue(user);

      const result = await adapter.create(user, tracking);

      expect(mongoRepository.create).toHaveBeenCalledWith(user, tracking);
      expect(result).toEqual(user);
    });
  });

  describe('createAdmin', () => {
    it('debe delegar la creación de admin al repositorio mongo', async () => {
      const admin = { ...user, role: 'admin' };
      mongoRepository.createAdmin.mockResolvedValue(admin);

      const result = await adapter.createAdmin(user, tracking);

      expect(mongoRepository.createAdmin).toHaveBeenCalledWith(user, tracking);
      expect(result).toEqual(admin);
    });
  });

  describe('update', () => {
    it('debe delegar la actualización al repositorio mongo', async () => {
      const updated = { ...user, firstName: 'Pedro' };
      mongoRepository.update.mockResolvedValue(updated);

      const result = await adapter.update('user-id-1', { firstName: 'Pedro' }, tracking);

      expect(mongoRepository.update).toHaveBeenCalledWith(
        'user-id-1',
        { firstName: 'Pedro' },
        tracking,
      );
      expect(result).toEqual(updated);
    });

    it('debe retornar null cuando el repositorio no actualiza nada', async () => {
      mongoRepository.update.mockResolvedValue(null);

      const result = await adapter.update('user-inexistente', { firstName: 'X' }, tracking);

      expect(result).toBeNull();
    });
  });

  describe('updateLastLogin', () => {
    it('debe delegar la actualización de lastLogin al repositorio mongo', async () => {
      mongoRepository.updateLastLogin.mockResolvedValue(undefined);

      await adapter.updateLastLogin('user-id-1', tracking);

      expect(mongoRepository.updateLastLogin).toHaveBeenCalledWith('user-id-1', tracking);
    });
  });

  describe('delete', () => {
    it('debe delegar la eliminación al repositorio mongo', async () => {
      mongoRepository.delete.mockResolvedValue(true);

      const result = await adapter.delete('user-id-1', tracking);

      expect(mongoRepository.delete).toHaveBeenCalledWith('user-id-1', tracking);
      expect(result).toBe(true);
    });

    it('debe retornar false cuando el repositorio no elimina nada', async () => {
      mongoRepository.delete.mockResolvedValue(false);

      const result = await adapter.delete('user-inexistente', tracking);

      expect(result).toBe(false);
    });
  });

  describe('checkUserNameExists', () => {
    it('debe delegar la verificación de nombre de usuario al repositorio mongo', async () => {
      mongoRepository.checkUserNameExists.mockResolvedValue(true);

      const result = await adapter.checkUserNameExists('usuario1', tracking);

      expect(mongoRepository.checkUserNameExists).toHaveBeenCalledWith('usuario1', tracking);
      expect(result).toBe(true);
    });

    it('debe retornar false cuando el nombre de usuario no existe', async () => {
      mongoRepository.checkUserNameExists.mockResolvedValue(false);

      const result = await adapter.checkUserNameExists('desconocido', tracking);

      expect(result).toBe(false);
    });
  });

  describe('checkEmailExists', () => {
    it('debe delegar la verificación de email al repositorio mongo', async () => {
      mongoRepository.checkEmailExists.mockResolvedValue(true);

      const result = await adapter.checkEmailExists('usuario@test.com', tracking);

      expect(mongoRepository.checkEmailExists).toHaveBeenCalledWith('usuario@test.com', tracking);
      expect(result).toBe(true);
    });

    it('debe retornar false cuando el email no existe', async () => {
      mongoRepository.checkEmailExists.mockResolvedValue(false);

      const result = await adapter.checkEmailExists('no@existe.com', tracking);

      expect(result).toBe(false);
    });
  });
});