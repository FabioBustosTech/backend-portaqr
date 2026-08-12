import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { QrModule } from './modules/qr/qr.module';
import { ScanModule } from './modules/scan/scan.module';
import { PlanModule } from './modules/plan/plan.module';
import { PetTagModule } from './modules/pet-tag/pet-tag.module';
import { QrActivateModule } from './modules/qr-activate/qr-activate.module';
import { QrFreeGenerationModule } from './modules/qr-free-generation/qr-free-generation.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { MailModule } from './modules/mail/mail.module';
import { WebpayModule } from './modules/webpay/webpay.module';
import { JwtAuthGuard } from './modules/auth/infrastructure/guards/jwt-auth.guard';
import { TrackingIdMiddleware } from './middleware/tracking-id.middleware';
import { RequestLoggerEntryMiddleware } from './middleware/request-logger-entry.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // SPEC-008 H4 (R4): rate limiting global — 10 req/min por defecto
    // (configurable con THROTTLE_TTL/THROTTLE_LIMIT). Reglas más agresivas
    // (5/min) en @Throttle de login/refresh/registro/contacto.
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: Number(configService.get<number>('THROTTLE_TTL')) || 60,
            limit: Number(configService.get<number>('THROTTLE_LIMIT')) || 10,
          },
        ],
      }),
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    QrModule,
    ScanModule,
    PlanModule,
    PetTagModule,
    QrActivateModule,
    QrFreeGenerationModule,
    StatisticsModule,
    MailModule,
    WebpayModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // SPEC-008 H4 (R4): throttler como guard global (junto a JwtAuthGuard)
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TrackingIdMiddleware)
      .forRoutes('*')
      .apply(RequestLoggerEntryMiddleware)
      .forRoutes('*');
  }
}