import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import type { GoogleProfile } from '../../domain/ports/in/google-auth-service.port';

/**
 * SPEC-020 RF-6: estrategia Google OAuth 2.0 (passport-google-oauth20).
 * Sin sessions (el proyecto no usa express-session): session: false en el guard.
 * passReqToCallback: true para poder leer el `state` de la cookie (ADR-020.6).
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['profile', 'email'],
      passReqToCallback: true,
    });
  }

  async validate(
    _req: unknown,
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<GoogleProfile> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new UnauthorizedException('No se pudo obtener el correo de tu cuenta de Google');
    }

    return {
      email,
      googleId: profile.id,
      givenName: profile.name?.givenName,
      familyName: profile.name?.familyName,
      picture: profile.photos?.[0]?.value,
    };
  }
}