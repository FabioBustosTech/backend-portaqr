import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';

import { AuthController } from './presentation/controllers/auth.controller';

import { AuthService } from './domain/services/auth.service';
import { JwtAuthService } from './domain/services/jwt.service';

import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { JwtAuthGuard } from './infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from './infrastructure/guards/roles.guard';

import { UsersModule } from '../users/users.module';
import { CommonModule } from '../../common/common.module';

import {
  AUTH_SERVICE_PORT,
  JWT_SERVICE_PORT,
} from './domain/constants/auth.tokens';

@Module({
  imports: [
    PassportModule.registerAsync({
      useFactory: () => ({
        defaultStrategy: 'jwt',
      }),
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION') as StringValue,
        },
      }),
    }),
    UsersModule,
    CommonModule,
  ],
  controllers: [AuthController],
  providers: [
    JwtAuthService,
    { provide: JWT_SERVICE_PORT, useExisting: JwtAuthService },
    { provide: AUTH_SERVICE_PORT, useClass: AuthService },
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [AUTH_SERVICE_PORT, JWT_SERVICE_PORT, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
