import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { GetUserUseCase } from '../../../users/application/use-cases/get-user.usecase';
import type { JwtPayload } from '../../domain/ports/in/jwt-service.port';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { loadJwtKeys } from '../jwt-keys';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private getUserUseCase: GetUserUseCase,
    private traceService: TraceService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // passport-jwt usa secretOrKey como nombre de la opción; acepta la llave
      // pública PEM para verificación asimétrica RS256
      secretOrKey: loadJwtKeys(configService).publicKey,
      algorithms: ['RS256'],
    });
  }

  async validate(payload: JwtPayload) {
    const tracking = {
      trackingId: `jwt-validate-${payload.sub}`,
      sessionId: '',
    };

    const user = await this.getUserUseCase.execute(payload.sub, tracking);
    this.traceService.log(tracking, TraceLayer.SERVICE, 'JwtStrategy.validate', {
      id: payload.sub,
      role: payload.role,
    });

    // Si el token fue emitido con una versión anterior a la actual del
    // usuario, fue invalidado (logout) y debe rechazarse.
    if ((payload.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
      this.traceService.log(
        tracking,
        TraceLayer.SERVICE,
        'JwtStrategy.validate - token invalidado',
        { id: payload.sub },
      );
      throw new UnauthorizedException('Token invalidado (sesión cerrada)');
    }

    return { id: user.id, email: user.email, userName: user.userName, role: user.role, isEmailVerified: user.isEmailVerified };
  }
}
