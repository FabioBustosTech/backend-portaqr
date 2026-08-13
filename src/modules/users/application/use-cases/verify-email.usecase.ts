import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import type { ICanGetUser } from '../../domain/ports/queries/get-user.port';
import type { ICanUpdateUser } from '../../domain/ports/queries/create-user.port';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { USER_GET_PORT, USER_UPDATE_PORT } from '../../domain/constants/user.tokens';
import { VERIFICATION_MAX_ATTEMPTS } from '../../../../common/utils/code-generator.util';

@Injectable()
export class VerifyEmailUseCase {
  constructor(
    @Inject(USER_GET_PORT)
    private readonly reader: ICanGetUser,
    @Inject(USER_UPDATE_PORT)
    private readonly updater: ICanUpdateUser,
    private readonly traceService: TraceService,
  ) {}

  async execute(userId: string, code: string, tracking: TrackingContext): Promise<void> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'VerifyEmailUseCase', { userId });

    const user = await this.reader.getById(userId, tracking);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('El email ya estÃ¡ verificado');
    }

    if (!user.verificationCode || !user.verificationCodeExpires) {
      throw new BadRequestException('No hay cÃ³digo de verificaciÃ³n pendiente');
    }

    if (user.verificationCode !== code) {
      // SPEC-009 A5: límite de intentos — tras 5 fallos se invalida el código
      const attempts = (user.verificationAttempts ?? 0) + 1;
      if (attempts >= VERIFICATION_MAX_ATTEMPTS) {
        await this.updater.update(userId, {
          verificationCode: undefined,
          verificationCodeExpires: undefined,
          verificationAttempts: 0,
        }, tracking);
        throw new BadRequestException('El cÃ³digo de verificaciÃ³n ha expirado');
      }
      await this.updater.update(userId, { verificationAttempts: attempts }, tracking);
      throw new BadRequestException('CÃ³digo de verificaciÃ³n invÃ¡lido');
    }

    if (new Date() > user.verificationCodeExpires) {
      throw new BadRequestException('El cÃ³digo de verificaciÃ³n ha expirado');
    }

    await this.updater.update(userId, {
      isEmailVerified: true,
      verificationCode: undefined,
      verificationCodeExpires: undefined,
      verificationAttempts: 0,
    }, tracking);

    this.traceService.log(tracking, TraceLayer.USE_CASE, 'VerifyEmailUseCase - verificado', { userId });
  }
}
