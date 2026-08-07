import { TraceService, TraceLayer } from './trace.service';
import type { TrackingContext } from '../decorators/tracking.decorator';

describe('TraceService', () => {
  let service: TraceService;
  let loggerSpy: jest.SpyInstance;

  const tracking: TrackingContext = {
    trackingId: 't-123',
    sessionId: 's-456',
  };

  beforeEach(() => {
    service = new TraceService();
    // Silenciar logs reales
    loggerSpy = jest.spyOn(service['logger'], 'log').mockImplementation(() => undefined);
    jest.spyOn(service['logger'], 'debug').mockImplementation(() => undefined);
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('debe loguear con formato de capa y tracking cuando hay data', () => {
      service.log(tracking, TraceLayer.USE_CASE, 'mensaje', { id: 1 });

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('[t-123][s-456]'),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('USE_CASE'),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('mensaje'),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('"id": 1'),
      );
    });

    it('debe loguear sin data cuando no se provee', () => {
      service.log(tracking, TraceLayer.CONTROLLER, 'solo mensaje');

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('solo mensaje'),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.not.stringContaining('\n'),
      );
    });
  });

  describe('debug', () => {
    it('debe loguear en nivel debug con data', () => {
      const debugSpy = jest.spyOn(service['logger'], 'debug');
      service.debug(tracking, TraceLayer.REPOSITORY, 'debug msg', { a: 1 });

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('debug msg'),
      );
    });

    it('debe loguear en nivel debug sin data', () => {
      const debugSpy = jest.spyOn(service['logger'], 'debug');
      service.debug(tracking, TraceLayer.REPOSITORY, 'debug msg');

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('debug msg'),
      );
    });
  });

  describe('error', () => {
    it('debe loguear el error con su mensaje', () => {
      const errorSpy = jest.spyOn(service['logger'], 'error');
      const err = new Error('boom');

      service.error(tracking, TraceLayer.SERVICE, 'fallo', err);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('fallo'),
      );
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('boom'),
      );
    });

    it('debe loguear el error sin mensaje de error si no se provee', () => {
      const errorSpy = jest.spyOn(service['logger'], 'error');

      service.error(tracking, TraceLayer.SERVICE, 'fallo');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('fallo'),
      );
    });
  });

  describe('warn', () => {
    it('debe loguear advertencia con data', () => {
      const warnSpy = jest.spyOn(service['logger'], 'warn');
      service.warn(tracking, TraceLayer.CONTROLLER, 'cuidado', { x: 1 });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('cuidado'),
      );
    });

    it('debe loguear advertencia sin data', () => {
      const warnSpy = jest.spyOn(service['logger'], 'warn');
      service.warn(tracking, TraceLayer.CONTROLLER, 'cuidado');

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('cuidado'),
      );
    });
  });

  describe('formatLayer', () => {
    it('debe aplicar color cyan para CONTROLLER', () => {
      const result = service['formatLayer'](TraceLayer.CONTROLLER);
      expect(result).toContain('\x1b[36m');
      expect(result).toContain('CONTROLLER');
    });

    it('debe aplicar color amarillo para USE_CASE', () => {
      const result = service['formatLayer'](TraceLayer.USE_CASE);
      expect(result).toContain('\x1b[33m');
    });

    it('debe aplicar color magenta para REPOSITORY', () => {
      const result = service['formatLayer'](TraceLayer.REPOSITORY);
      expect(result).toContain('\x1b[35m');
    });

    it('debe aplicar color azul para SERVICE', () => {
      const result = service['formatLayer'](TraceLayer.SERVICE);
      expect(result).toContain('\x1b[34m');
    });
  });
});