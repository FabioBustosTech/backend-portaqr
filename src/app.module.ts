import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD } from '@nestjs/core';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { QrModule } from './qr/qr.module';
import { ScanModule } from './scan/scan.module';
import { PlanModule } from './plan/plan.module';
import { PetTagModule } from './pet-tag/pet-tag.module';
import { QrActivateModule } from './modules/qr-activate/qr-activate.module';
import { QrFreeGenerationModule } from './qr-free-generation/qr-free-generation.module';
import { StatisticsModule } from './statistics/statistics.module';
import { MailModule } from './mail/mail.module';
import { WebpayModule } from './modules/webpay/webpay.module';
import { JwtAuthGuard } from './modules/auth/infrastructure/guards/jwt-auth.guard';
import { TrackingIdMiddleware } from './middleware/tracking-id.middleware';
import { RequestLoggerEntryMiddleware } from './middleware/request-logger-entry.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
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