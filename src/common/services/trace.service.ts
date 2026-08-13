import { Injectable, Logger } from '@nestjs/common';
import type { TrackingContext } from '../decorators/tracking.decorator';
import { sanitizeForLog } from '../utils/redact.utils';

export enum TraceLayer {
  CONTROLLER = 'CONTROLLER',
  USE_CASE = 'USE_CASE',
  REPOSITORY = 'REPOSITORY',
  SERVICE = 'SERVICE',
}

@Injectable()
export class TraceService {
  private readonly logger = new Logger('TRACE');

  private formatLayer(layer: TraceLayer): string {
    const colors: Record<TraceLayer, string> = {
      [TraceLayer.CONTROLLER]: '\x1b[36m', // Cyan
      [TraceLayer.USE_CASE]: '\x1b[33m', // Yellow
      [TraceLayer.REPOSITORY]: '\x1b[35m', // Magenta
      [TraceLayer.SERVICE]: '\x1b[34m', // Blue
    };
    return `${colors[layer]}${layer}\x1b[0m`;
  }

  log(
    tracking: TrackingContext,
    layer: TraceLayer,
    message: string,
    data?: unknown,
  ): void {
    const layerStr = this.formatLayer(layer);
    const trace = `[${tracking.trackingId}][${tracking.sessionId}]`;

    if (data) {
      this.logger.log(
        `${trace} ${layerStr} | ${message}\n${JSON.stringify(sanitizeForLog(data), null, 2)}`,
      );
    } else {
      this.logger.log(`${trace} ${layerStr} | ${message}`);
    }
  }

  debug(
    tracking: TrackingContext,
    layer: TraceLayer,
    message: string,
    data?: unknown,
  ): void {
    const layerStr = this.formatLayer(layer);
    const trace = `[${tracking.trackingId}][${tracking.sessionId}]`;

    if (data) {
      this.logger.debug(
        `${trace} ${layerStr} | ${message}\n${JSON.stringify(sanitizeForLog(data), null, 2)}`,
      );
    } else {
      this.logger.debug(`${trace} ${layerStr} | ${message}`);
    }
  }

  error(
    tracking: TrackingContext,
    layer: TraceLayer,
    message: string,
    error?: Error,
  ): void {
    const layerStr = this.formatLayer(layer);
    const trace = `[${tracking.trackingId}][${tracking.sessionId}]`;

    this.logger.error(
      `${trace} ${layerStr} | ${message}${error ? `\n${error.message}` : ''}`,
    );
  }

  warn(
    tracking: TrackingContext,
    layer: TraceLayer,
    message: string,
    data?: unknown,
  ): void {
    const layerStr = this.formatLayer(layer);
    const trace = `[${tracking.trackingId}][${tracking.sessionId}]`;

    if (data) {
      this.logger.warn(
        `${trace} ${layerStr} | ${message}\n${JSON.stringify(sanitizeForLog(data), null, 2)}`,
      );
    } else {
      this.logger.warn(`${trace} ${layerStr} | ${message}`);
    }
  }
}
