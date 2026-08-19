import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import type { ICanGetUser } from '../../domain/ports/queries/get-user.port';
import type { ICanUpdateUser } from '../../domain/ports/queries/create-user.port';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { USER_GET_PORT, USER_UPDATE_PORT } from '../../domain/constants/user.tokens';
import { PasswordService } from '../../domain/services/password.service';
import { IncrementTokenVersionUseCase } from './increment-token-version.usecase';
import { ChangePasswordDto } from '../dto/change-password.dto';

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(USER_GET_PORT)
    private readonly reader: ICanGetUser,
    @Inject(USER_UPDATE_PORT)
    private readonly updater: ICanUpdateUser,
    private readonly traceService: TraceService,
    private readonly passwordService: PasswordService,
    private readonly incrementTokenVersionUseCase: IncrementTokenVersionUseCase,
  ) {}

  async execute(
    usuarioId: string,
    changePasswordDto: ChangePasswordDto,
    tracking: TrackingContext,
  ): Promise<void> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'ChangePasswordUseCase', { usuarioId });

    const { currentPassword, newPassword } = changePasswordDto;
    const usuario = await this.reader.getById(usuarioId, tracking);

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    // SPEC-020: cuentas Google sin contraseña asignada (hasPassword false,
    // ADR-020.7) → primer set-password: NO hay contraseña anterior que verificar.
    // El hash aleatorio inutilizable hace que comparePassword siempre falle, por
    // eso se salta la verificación SOLO en este caso (y solo la primera vez).
    const esPrimerSetPassword = usuario.provider === 'google' && !usuario.hasPassword;

    if (!esPrimerSetPassword) {
      if (!usuario.password) {
        throw new UnauthorizedException('La contraseña actual es incorrecta.');
      }

      const isMatch = await this.passwordService.comparePassword(currentPassword ?? '', usuario.password);
      if (!isMatch) {
        throw new UnauthorizedException('La contraseña actual es incorrecta.');
      }
    }

    const hashedPassword = await this.passwordService.hashPassword(newPassword);
    await this.updater.update(
      usuarioId,
      { password: hashedPassword, hasPassword: true },
      tracking,
    );

    // SPEC-009 A8: cambiar la contraseña invalida las sesiones previas (tokenVersion++).
    // En el primer set-password de una cuenta Google NO se incrementa: el usuario
    // está logueado (vía Google) y no hay sesiones previas con contraseña que invalidar.
    if (!esPrimerSetPassword) {
      await this.incrementTokenVersionUseCase.execute(usuarioId, tracking);
    }

    this.traceService.log(tracking, TraceLayer.USE_CASE, 'ChangePasswordUseCase - cambiada', { usuarioId });
  }
}
