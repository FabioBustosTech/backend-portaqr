import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { CustomLogger } from '../../shared/utils/logger.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {

    private readonly logger = new CustomLogger(JwtStrategy.name);
  
    
  constructor(
    private configService: ConfigService,
    private usersService: UsersService, // Inyectar el servicio de usuarios
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET"),
    });
  }

  async validate(payload: any) {
    return { id: payload.sub, email: payload.email, username: payload.userName, role: payload.role };
  }

}