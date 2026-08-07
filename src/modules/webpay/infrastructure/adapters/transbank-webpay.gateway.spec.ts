import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WebpayPlus, Options, Environment } from 'transbank-sdk';
import { TransbankWebpayGateway } from './transbank-webpay.gateway';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';

const mockCreate = jest.fn();
const mockCommit = jest.fn();
const mockRefund = jest.fn();

jest.mock('transbank-sdk', () => ({
  WebpayPlus: {
    Transaction: jest.fn().mockImplementation(() => ({
      create: mockCreate,
      commit: mockCommit,
      refund: mockRefund,
    })),
  },
  Options: jest.fn(),
  Environment: {
    Production: 'PRODUCTION',
    Integration: 'INTEGRATION',
  },
}));

describe('TransbankWebpayGateway', () => {
  let gateway: TransbankWebpayGateway;
  let traceService: jest.Mocked<TraceService>;
  let configServiceMock: { get: jest.Mock };

  const TransactionMock = WebpayPlus.Transaction as unknown as jest.Mock;
  const OptionsMock = Options as unknown as jest.Mock;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const baseConfig: Record<string, unknown> = {
    WEBPAY_COMMERCE_CODE: '597012345678',
    WEBPAY_API_KEY: 'api-key-test',
    WEBPAY_ENVIRONMENT: 'TEST',
  };

  const createConfigMock = (values: Record<string, unknown>) => ({
    get: jest.fn((key: string) => values[key]),
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    configServiceMock = createConfigMock({ ...baseConfig });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransbankWebpayGateway,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
        {
          provide: TraceService,
          useValue: {
            log: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get(TransbankWebpayGateway);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(gateway).toBeDefined();
  });

  describe('constructor', () => {
    it('debe crear la instancia de Transaction con Options de integración por defecto', () => {
      expect(OptionsMock).toHaveBeenCalledWith(
        '597012345678',
        'api-key-test',
        Environment.Integration,
      );
      expect(TransactionMock).toHaveBeenCalledTimes(1);
    });

    it('debe usar el entorno de producción cuando WEBPAY_ENVIRONMENT es LIVE', async () => {
      configServiceMock = createConfigMock({ ...baseConfig, WEBPAY_ENVIRONMENT: 'LIVE' });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TransbankWebpayGateway,
          { provide: ConfigService, useValue: configServiceMock },
          {
            provide: TraceService,
            useValue: {
              log: jest.fn(),
              debug: jest.fn(),
              error: jest.fn(),
              warn: jest.fn(),
            },
          },
        ],
      }).compile();

      module.get(TransbankWebpayGateway);

      expect(OptionsMock).toHaveBeenCalledWith(
        '597012345678',
        'api-key-test',
        Environment.Production,
      );
    });
  });

  describe('createTransaction', () => {
    it('debe llamar a la SDK con los argumentos correctos y mapear la respuesta', async () => {
      mockCreate.mockResolvedValue({ token: 'tok-1', url: 'https://webpay.local/pay' });

      const result = await gateway.createTransaction(
        'BO-1',
        'S-1',
        5000,
        'https://front.local/return',
        tracking,
      );

      expect(mockCreate).toHaveBeenCalledWith('BO-1', 'S-1', 5000, 'https://front.local/return');
      expect(result).toEqual({ token: 'tok-1', url: 'https://webpay.local/pay' });
      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.SERVICE,
        'TransbankWebpayGateway.createTransaction',
        { buyOrder: 'BO-1', amount: 5000, returnUrl: 'https://front.local/return' },
      );
    });
  });

  describe('commitTransaction', () => {
    it('debe llamar a commit de la SDK con el token y retornar el resultado', async () => {
      const commitResponse = {
        amount: 5000,
        status: 'AUTHORIZED',
        buy_order: 'BO-1',
        session_id: 'S-1',
      };
      mockCommit.mockResolvedValue(commitResponse);

      const result = await gateway.commitTransaction('tok-1', tracking);

      expect(mockCommit).toHaveBeenCalledWith('tok-1');
      expect(result).toEqual(commitResponse);
      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.SERVICE,
        'TransbankWebpayGateway.commitTransaction',
        { token: 'tok-1' },
      );
    });
  });

  describe('refund', () => {
    it('debe llamar a refund de la SDK con token y monto y retornar el resultado', async () => {
      const refundResponse = { type: 'REFUNDED', nullified_amount: 5000 };
      mockRefund.mockResolvedValue(refundResponse);

      const result = await gateway.refund('tok-1', 5000, tracking);

      expect(mockRefund).toHaveBeenCalledWith('tok-1', 5000);
      expect(result).toEqual(refundResponse);
      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.SERVICE,
        'TransbankWebpayGateway.refund',
        { token: 'tok-1', amount: 5000 },
      );
    });
  });
});