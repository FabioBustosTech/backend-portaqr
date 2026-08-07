import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import type { ICanGetUser } from '../../domain/ports/queries/get-user.port';
import type { ICanUpdateUser } from '../../domain/ports/queries/create-user.port';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { USER_GET_PORT, USER_UPDATE_PORT } from '../../domain/constants/user.tokens';
import { PasswordService } from '../../domain/services/password.service';
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

    if (!usuario.password) {
      throw new UnauthorizedException('La contraseÃ±a actual es incorrecta.');
    }

    const isMatch = await this.passwordService.comparePassword(currentPassword, usuario.password);
    if (!isMatch) {
      throw new UnauthorizedException('La contraseÃ±a actual es incorrecta.');
    }

    const hashedPassword = await this.passwordService.hashPassword(newPassword);
    await this.updater.update(usuarioId, { password: hashedPassword }, tracking);

    this.traceService.log(tracking, TraceLayer.USE_CASE, 'ChangePasswordUseCase - cambiada', { usuarioId });
  }
}
