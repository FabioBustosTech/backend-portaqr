import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { GetUserUseCase } from '../../../users/application/use-cases/get-user.usecase';
import type { JwtPayload } from '../../domain/ports/in/jwt-service.port';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';

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
      secretOrKey: configService.get<string>('JWT_SECRET'),
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

    return { id: user.id, email: user.email, userName: user.userName, role: user.role, isEmailVerified: user.isEmailVerified };
  }
}
