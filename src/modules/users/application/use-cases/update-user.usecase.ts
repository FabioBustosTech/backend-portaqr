import { Injectable, Inject, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import type { ICanUpdateUser } from '../../domain/ports/queries/create-user.port';
import type { User } from '../../domain/entities/user.entity';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { USER_UPDATE_PORT } from '../../domain/constants/user.tokens';
import { assertOwnerOrAdmin } from '../../../../common/utils/ownership.utils';
import { NewsletterSyncService, type NewsletterSyncSource } from '../services/newsletter-sync.service';

/** Actor autenticado (extraído del token JWT en el controller). */
export interface UserActor {
  id: string;
  role: string;
}

@Injectable()
export class UpdateUserUseCase {
  private readonly logger = new Logger(UpdateUserUseCase.name);

  constructor(
    @Inject(USER_UPDATE_PORT)
    private readonly updater: ICanUpdateUser,
    private readonly traceService: TraceService,
    private readonly newsletterSync: NewsletterSyncService,
  ) {}

  async execute(
    id: string,
    data: Partial<User>,
    actor: UserActor,
    tracking: TrackingContext,
  ): Promise<User> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'UpdateUserUseCase', { id });

    // SPEC-009 A1 (dos capas): la regla de negocio vive en el usecase.
    // "Un usuario solo edita su propio perfil, salvo admin" — protege también a
    // callers futuros (scripts, seeders) que no pasen por el controller.
    assertOwnerOrAdmin(id, actor, 'No tiene permiso para modificar este usuario.');

    // isActive es un campo administrativo: solo admin puede cambiarlo.
    // (El campo vive solo en UpdateUserDto — no se persiste en la entidad.)
    const isActiveRequested = (data as { isActive?: boolean }).isActive;
    if (isActiveRequested !== undefined && actor.role !== 'admin') {
      throw new ForbiddenException(
        'Solo los administradores pueden modificar el estado activo del usuario.',
      );
    }

    // SPEC-030 RF-8: `newsletterSource` es transitorio (onboarding vs settings,
    // viene en UpdateUserDto) y NO se persiste en Mongo: se excluye del update.
    const { newsletterSource, ...persistData } = data as Partial<User> & {
      newsletterSource?: NewsletterSyncSource;
    };

    const updated = await this.updater.update(id, persistData, tracking);
    if (!updated) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // El PATCH con newsletterOptIn sincroniza al CMS (best-effort, RN-2).
    if (data.newsletterOptIn !== undefined) {
      await this.syncNewsletterPreference(updated, data.newsletterOptIn, newsletterSource ?? 'settings');
    }
    return updated;
  }

  /** Sync best-effort del cambio de preferencia; nunca lanza (RN-2). */
  private async syncNewsletterPreference(
    user: User,
    optIn: boolean,
    source: NewsletterSyncSource,
  ): Promise<void> {
    try {
      if (optIn) {
        const name = [user.firstName, user.paternalLastName].filter(Boolean).join(' ').trim();
        const synced = await this.newsletterSync.syncSubscribe({
          email: user.email,
          name: name || undefined,
          userId: user.id,
          source,
        });
        if (synced) {
          try {
            await this.updater.update(
              user.id,
              { newsletterSyncedAt: new Date() },
              { trackingId: 'newsletter-sync', sessionId: 'newsletter-sync' },
            );
          } catch {
            this.logger.warn(`newsletter_sync_failed { userId: ${user.id}, reason: audit-update }`);
          }
        }
      } else {
        await this.newsletterSync.syncUnsubscribe(user.email, user.id);
      }
    } catch {
      this.logger.warn(`newsletter_sync_failed { userId: ${user.id}, reason: inesperado }`);
    }
  }

  async updateLastLogin(userId: string, tracking: TrackingContext): Promise<void> {
    return this.updater.updateLastLogin(userId, tracking);
  }
}
