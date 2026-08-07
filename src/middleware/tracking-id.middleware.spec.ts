import { Request, Response, NextFunction } from 'express';
import { TrackingIdMiddleware } from './tracking-id.middleware';

jest.mock('uuid', () => ({ v4: () => 'fixed-uuid-1234' }));

describe('TrackingIdMiddleware', () => {
  let middleware: TrackingIdMiddleware;

  const mockReq = (headers: Record<string, unknown> = {}): Request =>
    ({
      headers: { ...headers },
      method: 'GET',
      url: '/',
      body: {},
      query: {},
      params: {},
    }) as unknown as Request;

  const mockRes = (): Response => {
    const res = {
      setHeader: jest.fn(),
    } as unknown as Response;
    return res;
  };

  beforeEach(() => {
    middleware = new TrackingIdMiddleware();
    jest.spyOn(middleware['logger'], 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('debe estar definido', () => {
    expect(middleware).toBeDefined();
  });

  it('debe usar el trackingId existente en x-tracking-id', () => {
    const req = mockReq({ 'x-tracking-id': 'existing-id' });
    const res = mockRes();
    const next: NextFunction = jest.fn();

    middleware.use(req, res, next);

    expect(req['trackingId']).toBe('existing-id');
    expect(res.setHeader).not.toHaveBeenCalled();
    expect(req.headers['x-tracking-id']).toBe('existing-id');
    expect(next).toHaveBeenCalled();
  });

  it('debe usar el trackingId existente en el header trackingId', () => {
    const req = mockReq({ trackingId: 'legacy-id' });
    const res = mockRes();
    const next: NextFunction = jest.fn();

    middleware.use(req, res, next);

    expect(req['trackingId']).toBe('legacy-id');
    expect(req.headers['x-tracking-id']).toBe('legacy-id');
    expect(next).toHaveBeenCalled();
  });

  it('debe generar un nuevo trackingId con uuid v4 cuando no existe', () => {
    const req = mockReq();
    const res = mockRes();
    const next: NextFunction = jest.fn();

    middleware.use(req, res, next);

    expect(req['trackingId']).toBe('fixed-uuid-1234');
    expect(res.setHeader).toHaveBeenCalledWith('X-Tracking-Id', 'fixed-uuid-1234');
    expect(req.headers['x-tracking-id']).toBe('fixed-uuid-1234');
    expect(next).toHaveBeenCalled();
  });
});