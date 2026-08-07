import { Request, Response, NextFunction } from 'express';
import { RequestLoggerEntryMiddleware } from './request-logger-entry.middleware';

describe('RequestLoggerEntryMiddleware', () => {
  let middleware: RequestLoggerEntryMiddleware;

  const mockReq = (): Request =>
    ({
      method: 'POST',
      url: '/api/test',
      headers: { 'x-tracking-id': 'track-1', 'content-type': 'application/json' },
      body: { key: 'value' },
      query: { page: '1' },
      params: { id: 'abc' },
    }) as unknown as Request;

  const mockRes = (): Response => ({} as Response);

  beforeEach(() => {
    middleware = new RequestLoggerEntryMiddleware();
    jest.spyOn(middleware['logger'], 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('debe estar definido', () => {
    expect(middleware).toBeDefined();
  });

  it('debe loguear los datos del request y llamar next()', () => {
    const req = mockReq();
    const res = mockRes();
    const next: NextFunction = jest.fn();
    const logSpy = jest.spyOn(middleware['logger'], 'log');

    middleware.use(req, res, next);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('"method": "POST"'),
      'RequestLogger',
      'RequestLogger',
      'track-1',
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('"url": "/api/test"'),
      'RequestLogger',
      'RequestLogger',
      'track-1',
    );
    expect(next).toHaveBeenCalled();
  });

  it('debe llamar next() incluso sin trackingId', () => {
    const req = mockReq();
    req.headers = {};
    const res = mockRes();
    const next: NextFunction = jest.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});