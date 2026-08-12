import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import type { ICanGetUser } from '../../domain/ports/queries/get-user.port';
import type { ICanUpdateUser } from '../../domain/ports/queries/create-user.port';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { USER_GET_PORT, USER_UPDATE_PORT } from '../../domain/constants/user.tokens';
import { PasswordService } from '../../domain/services/password.service';
import { IncrementTokenVersionUseCase } from './increment-token-version.usecase';
import { VERIFICATION_MAX_ATTEMPTS } from '../../../../common/utils/code-generator.util';

@Injectable()
export class ResetPasswordUseCase {
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
    email: string,
    code: string,
    newPassword: string,
    tracking: TrackingContext,
  ): Promise<void> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'ResetPasswordUseCase', { email });

    const user = await this.reader.getByEmail(email, tracking);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!user.passwordResetCode || !user.passwordResetExpires) {
      throw new BadRequestException('No hay cÃ³digo de recuperaciÃ³n pendiente');
    }

    if (user.passwordResetCode !== code) {
      // SPEC-009 A5: límite de intentos — tras 5 fallos se invalida el código
      const attempts = (user.passwordResetAttempts ?? 0) + 1;
      if (attempts >= VERIFICATION_MAX_ATTEMPTS) {
        await this.updater.update(user.id, {
          passwordResetCode: undefined,
          passwordResetExpires: undefined,
          passwordResetAttempts: 0,
        }, tracking);
        throw new BadRequestException('El cÃ³digo de recuperaciÃ³n ha expirado');
      }
      await this.updater.update(user.id, { passwordResetAttempts: attempts }, tracking);
      throw new BadRequestException('CÃ³digo de recuperaciÃ³n invÃ¡lido');
    }

    if (new Date() > user.passwordResetExpires) {
      throw new BadRequestException('El cÃ³digo de recuperaciÃ³n ha expirado');
    }

    const passwordHash = await this.passwordService.hashPassword(newPassword);

    await this.updater.update(user.id, {
      password: passwordHash,
      passwordResetCode: undefined,
      passwordResetExpires: undefined,
      passwordResetAttempts: 0,
    }, tracking);

    // SPEC-009 A8: resetear la contraseña invalida las sesiones previas (tokenVersion++)
    await this.incrementTokenVersionUseCase.execute(user.id, tracking);

    this.traceService.log(tracking, TraceLayer.USE_CASE, 'ResetPasswordUseCase - actualizado', { email });
  }
}
