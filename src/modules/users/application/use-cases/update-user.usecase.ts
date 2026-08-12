import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import type { ICanUpdateUser } from '../../domain/ports/queries/create-user.port';
import type { User } from '../../domain/entities/user.entity';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { USER_UPDATE_PORT } from '../../domain/constants/user.tokens';
import { assertOwnerOrAdmin } from '../../../../common/utils/ownership.utils';

/** Actor autenticado (extraído del token JWT en el controller). */
export interface UserActor {
  id: string;
  role: string;
}

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_UPDATE_PORT)
    private readonly updater: ICanUpdateUser,
    private readonly traceService: TraceService,
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

    const updated = await this.updater.update(id, data, tracking);
    if (!updated) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return updated;
  }

  async updateLastLogin(userId: string, tracking: TrackingContext): Promise<void> {
    return this.updater.updateLastLogin(userId, tracking);
  }
}
