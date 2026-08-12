import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthController } from './presentation/controllers/auth.controller';

import { AuthService } from './domain/services/auth.service';
import { JwtAuthService } from './domain/services/jwt.service';

import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { JwtAuthGuard } from './infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from './infrastructure/guards/roles.guard';
import { MongoRefreshTokenRepository } from './infrastructure/repository/mongo/mongo-refresh-token.repository';
import { RefreshTokenSchema, RefreshTokenSchemaDefinition } from './infrastructure/repository/mongo/refresh-token.schema';

import { UsersModule } from '../users/users.module';
import { CommonModule } from '../../common/common.module';

import {
  AUTH_SERVICE_PORT,
  JWT_SERVICE_PORT,
  REFRESH_TOKEN_STORE_PORT,
} from './domain/constants/auth.tokens';

@Module({
  imports: [
    PassportModule.registerAsync({
      useFactory: () => ({
        defaultStrategy: 'jwt',
      }),
    }),
    // El JwtService se configura por llamada (privateKey/publicKey RS256 en
    // jwt.service.ts y jwt.strategy.ts); no hay secret global HS256.
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: RefreshTokenSchema.name, schema: RefreshTokenSchemaDefinition }, // SPEC-009 A8
    ]),
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
    // SPEC-009 A8: rotación + detección de reuso de refresh tokens
    { provide: REFRESH_TOKEN_STORE_PORT, useClass: MongoRefreshTokenRepository },
  ],
  exports: [AUTH_SERVICE_PORT, JWT_SERVICE_PORT, JwtAuthGuard, RolesGuard, REFRESH_TOKEN_STORE_PORT],
})
export class AuthModule {}
