import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CustomLogger } from '../shared/utils/logger.util';

@Injectable()
export class RequestLoggerEntryMiddleware implements NestMiddleware {
  private logger = new CustomLogger('RequestLoggerMiddleware');

  use(req: Request, res: Response, next: NextFunction) {
    const trackingId = req.headers['x-tracking-id'] as string;
    
    const logData = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      query: req.query,
      params: req.params
    };

    this.logger.log(
      JSON.stringify(logData, null, 2),
      'RequestLogger',
      'RequestLogger',
      trackingId
    );

    next();
  }
}