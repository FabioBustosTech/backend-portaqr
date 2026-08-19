import { Injectable, ExecutionContext, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import type { Observable } from 'rxjs';
import type { Response, Request } from 'express';

/** Lee una cookie del header Cookie sin cookie-parser (el proyecto no lo usa). */
export function readCookie(req: { headers: { cookie?: string } }, name: string): string | undefined {
  const header = req.headers?.cookie;
  if (!header) return undefined;
  const match = header.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

/**
 * SPEC-020 RF-7 (ADR-020.6): guard de INICIO del flujo Google.
 * Genera `state` CSPRNG (16 hex), lo guarda en cookie httpOnly `oauth_state`
 * (SameSite=Lax, 10 min, secure en prod) y lo pasa a passport como authenticateOptions.
 * También persiste el `mode` del flujo ('login' | 'signup') en cookie httpOnly
 * `oauth_mode` — el callback lo usa para decidir si crea cuenta o no.
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const state = randomBytes(8).toString('hex'); // 16 hex CSPRNG

    const cookieOptions = {
      httpOnly: true,
      sameSite: 'lax' as const,
      maxAge: 10 * 60 * 1000, // 10 min
      secure: this.configService.get<string>('NODE_ENV') === 'production',
    };

    res.cookie('oauth_state', state, cookieOptions);

    // SPEC-020: mode del flujo — 'signup' (crea si no existe, términos aceptados
    // en el frontend) o 'login' (NO crea — redirige a signup si no hay cuenta).
    const mode = (req.query?.mode as string) === 'login' ? 'login' : 'signup';
    res.cookie('oauth_mode', mode, cookieOptions);

    return { state };
  }
}

/**
 * SPEC-020 RF-7 (ADR-020.6): guard del CALLBACK de Google.
 * Valida el `state` de la query contra la cookie `oauth_state` (CSRF).
 * Si no coincide → 400 'Estado de autenticación inválido' (no crea/vincula nada — RN-8).
 */
@Injectable()
export class GoogleAuthCallbackGuard extends AuthGuard('google') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const req = context.switchToHttp().getRequest<{
      query: { state?: string };
      headers: { cookie?: string };
    }>();
    const state = req.query?.state;
    const cookieState = readCookie(req, 'oauth_state');

    if (!state || !cookieState || state !== cookieState) {
      throw new BadRequestException('Estado de autenticación inválido');
    }

    return super.canActivate(context);
  }
}