import { Logger } from '@nestjs/common';
import { CustomLogger } from './logger.util';

describe('CustomLogger', () => {
  let logger: CustomLogger;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;
  let verboseSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new CustomLogger('TestContext');
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    debugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    verboseSpy = jest.spyOn(Logger.prototype, 'verbose').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('log', () => {
    it('debe formatear el mensaje con contexto, método y trackingId', () => {
      logger.log('mensaje de prueba', 'AuthContext', 'login', 'track-123');

      expect(logSpy).toHaveBeenCalledWith(
        '[BACKEND-PORTAQR] [AuthContext] [login] [TrackingID: track-123] mensaje de prueba',
        'AuthContext',
      );
    });

    it('debe omitir método y trackingId cuando no se entregan', () => {
      logger.log('mensaje simple', 'Ctx');

      expect(logSpy).toHaveBeenCalledWith(
        '[BACKEND-PORTAQR] [Ctx] mensaje simple',
        'Ctx',
      );
    });

    it('debe funcionar sin contexto', () => {
      logger.log('solo mensaje');

      expect(logSpy).toHaveBeenCalledWith(
        '[BACKEND-PORTAQR] solo mensaje',
        undefined,
      );
    });
  });

  describe('error', () => {
    it('debe formatear el mensaje y pasar el trace y el contexto', () => {
      logger.error('algo falló', 'stack-trace', 'Ctx', 'metodo', 'track-1');

      expect(errorSpy).toHaveBeenCalledWith(
        '[BACKEND-PORTAQR] [Ctx] [metodo] [TrackingID: track-1] algo falló',
        'stack-trace',
        'Ctx',
      );
    });

    it('debe omitir trackingId cuando no se entrega', () => {
      logger.error('algo falló', 'stack-trace', 'Ctx');

      expect(errorSpy).toHaveBeenCalledWith(
        '[BACKEND-PORTAQR] [Ctx] algo falló',
        'stack-trace',
        'Ctx',
      );
    });
  });

  describe('warn', () => {
    it('debe formatear el mensaje y pasar el contexto', () => {
      logger.warn('cuidado', 'Ctx', 'metodo', 'track-2');

      expect(warnSpy).toHaveBeenCalledWith(
        '[BACKEND-PORTAQR] [Ctx] [metodo] [TrackingID: track-2] cuidado',
        'Ctx',
      );
    });

    it('debe omitir método y trackingId cuando no se entregan', () => {
      logger.warn('cuidado', 'Ctx');

      expect(warnSpy).toHaveBeenCalledWith(
        '[BACKEND-PORTAQR] [Ctx] cuidado',
        'Ctx',
      );
    });
  });

  describe('debug', () => {
    it('debe formatear el mensaje y pasar el contexto', () => {
      logger.debug('detalle', 'Ctx', 'metodo', 'track-3');

      expect(debugSpy).toHaveBeenCalledWith(
        '[BACKEND-PORTAQR] [Ctx] [metodo] [TrackingID: track-3] detalle',
        'Ctx',
      );
    });

    it('debe omitir contexto cuando no se entrega', () => {
      logger.debug('detalle');

      expect(debugSpy).toHaveBeenCalledWith('[BACKEND-PORTAQR] detalle', undefined);
    });
  });

  describe('verbose', () => {
    it('debe formatear el mensaje y pasar el contexto', () => {
      logger.verbose('muy detallado', 'Ctx', 'metodo', 'track-4');

      expect(verboseSpy).toHaveBeenCalledWith(
        '[BACKEND-PORTAQR] [Ctx] [metodo] [TrackingID: track-4] muy detallado',
        'Ctx',
      );
    });

    it('debe omitir método y trackingId cuando no se entregan', () => {
      logger.verbose('muy detallado', 'Ctx');

      expect(verboseSpy).toHaveBeenCalledWith(
        '[BACKEND-PORTAQR] [Ctx] muy detallado',
        'Ctx',
      );
    });
  });
});