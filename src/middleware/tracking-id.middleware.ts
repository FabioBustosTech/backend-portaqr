import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CustomLogger } from '../shared/utils/logger.util';

@Injectable()
export class TrackingIdMiddleware implements NestMiddleware {
  private readonly logger = new CustomLogger(TrackingIdMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Verifica si ya existe un trackingId en los headers
    const existingTrackingId = req.headers['x-tracking-id'] || req.headers['trackingId'];
    
    if (existingTrackingId) {
      req['trackingId'] = existingTrackingId;
      this.logger.debug(`Usando trackingId existente: ${existingTrackingId}`, TrackingIdMiddleware.name, 'use');
    } else {
      // Genera un nuevo trackingId
      const newTrackingId = uuidv4();
      req['trackingId'] = newTrackingId;
      // Agrega el trackingId a los headers de la respuesta
      res.setHeader('X-Tracking-Id', newTrackingId);
      this.logger.debug(`Generado nuevo trackingId: ${newTrackingId}`, TrackingIdMiddleware.name, 'use');
    }

    // Propaga el trackingId a los headers de la petición para servicios downstream
    req.headers['x-tracking-id'] = req['trackingId'];

    next();
  }
}