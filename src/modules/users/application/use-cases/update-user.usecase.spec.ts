import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UpdateUserUseCase } from './update-user.usecase';
import { USER_UPDATE_PORT } from '../../domain/constants/user.tokens';
import type { ICanUpdateUser } from '../../domain/ports/queries/create-user.port';
import type { User } from '../../domain/entities/user.entity';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { NewsletterSyncService } from '../services/newsletter-sync.service';

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;
  let updater: jest.Mocked<ICanUpdateUser>;
  let traceService: jest.Mocked<TraceService>;
  let newsletterSync: jest.Mocked<NewsletterSyncService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const mockUser: User = {
    id: 'user-1',
    email: 'test@test.com',
    userName: 'testuser',
    firstName: 'Test',
    paternalLastName: 'Apellido',
    maternalLastName: 'Apellido2',
    role: 'user',
    isEmailVerified: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateUserUseCase,
        {
          provide: USER_UPDATE_PORT,
          useValue: {
            update: jest.fn(),
            updateLastLogin: jest.fn(),
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
        {
          provide: NewsletterSyncService,
          useValue: {
            syncSubscribe: jest.fn(),
            syncUnsubscribe: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(UpdateUserUseCase);
    updater = module.get(USER_UPDATE_PORT) as jest.Mocked<ICanUpdateUser>;
    traceService = module.get(TraceService);
    newsletterSync = module.get(NewsletterSyncService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    const ownerActor = { id: 'user-1', role: 'user' };
    const adminActor = { id: 'admin-1', role: 'admin' };
    const otherActor = { id: 'user-2', role: 'user' };

    it('debe actualizar el usuario y retornarlo', async () => {
      const updatedUser: User = { ...mockUser, firstName: 'NuevoNombre' };
      updater.update.mockResolvedValue(updatedUser);

      const result = await useCase.execute(
        'user-1',
        { firstName: 'NuevoNombre' },
        ownerActor,
        tracking,
      );

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'UpdateUserUseCase',
        { id: 'user-1' },
      );
      expect(updater.update).toHaveBeenCalledWith(
        'user-1',
        { firstName: 'NuevoNombre' },
        tracking,
      );
      expect(result).toEqual(updatedUser);
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      updater.update.mockResolvedValue(null);

      await expect(
        useCase.execute('user-1', { firstName: 'X' }, ownerActor, tracking),
      ).rejects.toThrow(NotFoundException);
    });

    it('SPEC-009 A1: rechaza con 403 si el actor no es dueño ni admin (no llama al repo)', async () => {
      await expect(
        useCase.execute('user-1', { firstName: 'X' }, otherActor, tracking),
      ).rejects.toThrow(ForbiddenException);
      expect(updater.update).not.toHaveBeenCalled();
    });

    it('SPEC-009 A1: admin puede actualizar a cualquier usuario (bypass)', async () => {
      const updatedUser: User = { ...mockUser, firstName: 'AdminEdit' };
      updater.update.mockResolvedValue(updatedUser);

      const result = await useCase.execute('user-1', { firstName: 'AdminEdit' }, adminActor, tracking);
      expect(result).toEqual(updatedUser);
    });

    it('SPEC-009 A1: isActive solo admin — user recibe 403 aunque sea el dueño', async () => {
      await expect(
        useCase.execute('user-1', { isActive: false } as Partial<User>, ownerActor, tracking),
      ).rejects.toThrow(ForbiddenException);
      expect(updater.update).not.toHaveBeenCalled();
    });

    it('SPEC-009 A1: admin puede modificar isActive', async () => {
      const updatedUser: User = { ...mockUser, isActive: false } as User;
      updater.update.mockResolvedValue(updatedUser);

      const result = await useCase.execute('user-1', { isActive: false } as Partial<User>, adminActor, tracking);
      expect(result).toEqual(updatedUser);
    });

    it('SPEC-030 RF-8: PATCH con newsletterOptIn true sincroniza al CMS (source onboarding)', async () => {
      const updatedUser: User = { ...mockUser, newsletterOptIn: true };
      updater.update.mockResolvedValue(updatedUser);
      newsletterSync.syncSubscribe.mockResolvedValue(true);

      const result = await useCase.execute(
        'user-1',
        { newsletterOptIn: true, newsletterSource: 'onboarding' } as Partial<User>,
        ownerActor,
        tracking,
      );

      // newsletterSource no se persiste (transitorio).
      expect(updater.update).toHaveBeenCalledWith('user-1', { newsletterOptIn: true }, tracking);
      expect(newsletterSync.syncSubscribe).toHaveBeenCalledWith({
        email: 'test@test.com',
        name: 'Test Apellido',
        userId: 'user-1',
        source: 'onboarding',
      });
      expect(result).toEqual(updatedUser);
    });

    it('SPEC-030 RF-8: PATCH con newsletterOptIn false da de baja en el CMS', async () => {
      const updatedUser: User = { ...mockUser, newsletterOptIn: false };
      updater.update.mockResolvedValue(updatedUser);
      newsletterSync.syncUnsubscribe.mockResolvedValue(true);

      await useCase.execute('user-1', { newsletterOptIn: false }, ownerActor, tracking);

      expect(newsletterSync.syncUnsubscribe).toHaveBeenCalledWith('test@test.com', 'user-1');
      expect(newsletterSync.syncSubscribe).not.toHaveBeenCalled();
    });

    it('SPEC-030 RF-8: PATCH sin newsletterOptIn no toca el CMS', async () => {
      updater.update.mockResolvedValue(mockUser);

      await useCase.execute('user-1', { firstName: 'X' }, ownerActor, tracking);

      expect(newsletterSync.syncSubscribe).not.toHaveBeenCalled();
      expect(newsletterSync.syncUnsubscribe).not.toHaveBeenCalled();
    });

    it('SPEC-030 RN-2: fallo del sync no rompe el update', async () => {
      const updatedUser: User = { ...mockUser, newsletterOptIn: true };
      updater.update.mockResolvedValue(updatedUser);
      newsletterSync.syncSubscribe.mockRejectedValue(new Error('CMS caído'));

      const result = await useCase.execute('user-1', { newsletterOptIn: true }, ownerActor, tracking);

      expect(result).toEqual(updatedUser);
    });

    it('SPEC-030 timing verificado: email sin verificar no toca el CMS (difiere a verify)', async () => {
      const updatedUser: User = { ...mockUser, isEmailVerified: false, newsletterOptIn: true };
      updater.update.mockResolvedValue(updatedUser);

      await useCase.execute('user-1', { newsletterOptIn: true }, ownerActor, tracking);

      expect(newsletterSync.syncSubscribe).not.toHaveBeenCalled();
      expect(newsletterSync.syncUnsubscribe).not.toHaveBeenCalled();
    });
  });

  describe('updateLastLogin', () => {
    it('debe delegar en el puerto', async () => {
      updater.updateLastLogin.mockResolvedValue(undefined);

      await useCase.updateLastLogin('user-1', tracking);

      expect(updater.updateLastLogin).toHaveBeenCalledWith('user-1', tracking);
    });
  });
});