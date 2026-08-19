import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthController } from './presentation/controllers/auth.controller';

import { AuthService } from './domain/services/auth.service';
import { JwtAuthService } from './domain/services/jwt.service';
import { GoogleAuthService } from './domain/services/google-auth.service';

import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { GoogleStrategy } from './infrastructure/strategies/google.strategy';
import { JwtAuthGuard } from './infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from './infrastructure/guards/roles.guard';
import { GoogleAuthGuard, GoogleAuthCallbackGuard } from './infrastructure/guards/google-auth.guard';
import { MongoRefreshTokenRepository } from './infrastructure/repository/mongo/mongo-refresh-token.repository';
import { RefreshTokenSchema, RefreshTokenSchemaDefinition } from './infrastructure/repository/mongo/refresh-token.schema';

import { UsersModule } from '../users/users.module';
import { CommonModule } from '../../common/common.module';
import { EmailModule } from '../../shared/email/email.module'; // SPEC-020 RF-27: provee EmailService (implementa ICanSendWelcomeEmail)
import { EmailService } from '../../shared/email/email.service';

import {
  AUTH_SERVICE_PORT,
  JWT_SERVICE_PORT,
  REFRESH_TOKEN_STORE_PORT,
  AUTH_EMAIL_PORT, // SPEC-020 RF-27
  GOOGLE_AUTH_SERVICE_PORT, // SPEC-020 RF-11
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
    EmailModule, // SPEC-020 RF-27: provee EmailService (implementa ICanSendWelcomeEmail)
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
    // SPEC-020 RF-27 (ADR-019.8): EmailService implementa estructuralmente ICanSendWelcomeEmail
    { provide: AUTH_EMAIL_PORT, useExisting: EmailService },
    // SPEC-020 RF-11: Google OAuth — estrategia, servicio y guards
    GoogleStrategy,
    GoogleAuthGuard,
    GoogleAuthCallbackGuard,
    { provide: GOOGLE_AUTH_SERVICE_PORT, useClass: GoogleAuthService },
    GoogleAuthService,
  ],
  exports: [AUTH_SERVICE_PORT, JWT_SERVICE_PORT, JwtAuthGuard, RolesGuard, REFRESH_TOKEN_STORE_PORT],
})
export class AuthModule {}
