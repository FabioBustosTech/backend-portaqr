import { Logger } from '@nestjs/common';

export class CustomLogger extends Logger {
  private static readonly PROJECT_NAME = 'BACKEND-PORTAQR';

  private formatMessage(message: string, context?: string, method?: string, trackingId?: string): string {
    const parts = [`[${CustomLogger.PROJECT_NAME}]`];
    if (context) parts.push(`[${context}]`);
    if (method) parts.push(`[${method}]`);
    if (trackingId) parts.push(`[TrackingID: ${trackingId}]`);
    parts.push(message);
    return parts.join(' ');
  }

  log(message: string, context?: string, method?: string, trackingId?: string, trace?: string) {
    super.log(
      this.formatMessage(message, context, method, trackingId),
      context
    );
  }

  error(message: string, trace?: string, context?: string, method?: string, trackingId?: string) {
    super.error(
      this.formatMessage(message, context, method, trackingId),
      trace,
      context
    );
  }

  warn(message: string, context?: string, method?: string, trackingId?: string, trace?: string) {
    super.warn(
      this.formatMessage(message, context, method, trackingId),
      context
    );
  }

  debug(message: string, context?: string, method?: string, trackingId?: string, trace?: string) {
    super.debug(
      this.formatMessage(message, context, method, trackingId),
      context
    );
  }

  verbose(message: string, context?: string, method?: string, trackingId?: string, trace?: string) {
    super.verbose(
      this.formatMessage(message, context, method, trackingId),
      context
    );
  }
}