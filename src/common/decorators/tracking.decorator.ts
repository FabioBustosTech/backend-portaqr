import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface TrackingContext {
  trackingId: string;
  sessionId: string;
  origin?: string;
  userAgent?: string;
  ip?: string;
}

/** Interfaz para el request con headers */
interface RequestWithHeaders {
  headers?: Record<string, unknown>;
  ip?: string;
  connection?: { remoteAddress?: string };
}

export const Tracking = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): TrackingContext => {
    const httpReq = ctx.switchToHttp().getRequest<RequestWithHeaders>();

    const headers: Record<string, unknown> = httpReq?.headers || {};

    return {
      trackingId:
        (headers['x-tracking-id'] as string) ||
        (headers['x-request-id'] as string) ||
        'unknown',
      sessionId: (headers['x-session-id'] as string) || 'unknown',
      origin:
        (headers['origin'] as string) ||
        httpReq?.connection?.remoteAddress ||
        undefined,
      userAgent: (headers['user-agent'] as string) || undefined,
      ip: httpReq?.ip || (headers['x-forwarded-for'] as string) || undefined,
    };
  },
);
