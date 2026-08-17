import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QrActivatedNotificationService } from './qr-activated-notification.service';
import { QR_ACTIVATE_EMAIL_PORT } from '../../domain/constants/qr-activate.tokens';
import type { ICanSendQrActivatedEmail } from '../../domain/ports/queries/qr-activate-email.port';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { GetUserUseCase } from '../../../users/application/use-cases/get-user.usecase';
import { GetQrUseCase } from '../../../qr/application/use-cases/get-qr.usecase';
import {
  MethodActivation,
  ActivationState,
  DocumentType,
} from '../../domain/entities/qr-activate.entity';
import type { QrActivate } from '../../domain/entities/qr-activate.entity';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';

describe('QrActivatedNotificationService (SPEC-019 RF-4)', () => {
  let service: QrActivatedNotificationService;
  let emailSender: jest.Mocked<ICanSendQrActivatedEmail>;
  let getUserUseCase: jest.Mocked<GetUserUseCase>;
  let getQrUseCase: jest.Mocked<GetQrUseCase>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };

  const mockActivation: QrActivate = {
    id: 'act-1',
    methodActivation: MethodActivation.WEBPAY,
    state: ActivationState.PAYED,
    activationDate: new Date('2026-08-17T12:00:00Z'),
    price: { TotalPrice: 9990, TotalTax: 1898 },
    userId: 'user-1',
    qrList: [
      {
        qrCode: 'abc123',
        price: 9990,
        expirationDate: new Date('2027-08-17T12:00:00Z'),
        duration: '12 meses',
        plan: 'plan-1',
      },
    ],
    documentType: DocumentType.BOLETA,
    createdAt: new Date('2026-08-16T10:00:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QrActivatedNotificationService,
        {
          provide: QR_ACTIVATE_EMAIL_PORT,
          useValue: { sendQrActivatedEmail: jest.fn() },
        },
        {
          provide: GetUserUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetQrUseCase,
          useValue: { execute: jest.fn() },
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
        {
          provide: ConfigService,
          useValue: { get: jest.fn((key: string) => (key === 'FRONTEND_URL' ? 'http://localhost:3000' : undefined)) },
        },
      ],
    }).compile();

    service = module.get(QrActivatedNotificationService);
    emailSender = module.get(QR_ACTIVATE_EMAIL_PORT);
    getUserUseCase = module.get(GetUserUseCase);
    getQrUseCase = module.get(GetQrUseCase);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debe enviar el correo al dueño con typeLabel correcto por typeQr y datos del snapshot', async () => {
    getUserUseCase.execute.mockResolvedValue({
      id: 'user-1',
      email: 'cliente@example.com',
      userName: 'cliente1',
      firstName: 'Juan',
      paternalLastName: 'Pérez',
      maternalLastName: 'González',
      role: 'user',
      isEmailVerified: true,
    });
    getQrUseCase.execute.mockResolvedValue({
      id: 'qr-doc-1',
      idQr: 'abc123',
      userId: 'user-1',
      typeQr: 'dynamic',
      data: { typeQr: 'dynamic' },
    });

    await service.notify(mockActivation, tracking);

    expect(emailSender.sendQrActivatedEmail).toHaveBeenCalledTimes(1);
    const payload = emailSender.sendQrActivatedEmail.mock.calls[0][0];
    expect(payload.to).toBe('cliente@example.com');
    expect(payload.userName).toBe('Juan Pérez');
    expect(payload.methodActivation).toBe('WEBPAY');
    expect(payload.totalPrice).toBe(9990);
    expect(payload.qrItems).toHaveLength(1);
    expect(payload.qrItems[0]).toEqual({
      code: 'abc123',
      name: undefined,
      typeQr: 'dynamic',
      typeLabel: 'QR Dinámico',
      plan: 'plan-1',
      duration: '12 meses',
      activationDate: mockActivation.activationDate,
      expirationDate: mockActivation.qrList[0].expirationDate,
      // FIX 2026-08-17: la landing usa idQr (UUID público) — no el _id de Mongo
      landingUrl: 'http://localhost:3000/qr/abc123?origen=qr',
    });
  });

  it('debe resolver el label de un QR multilink (list) con su name', async () => {
    getUserUseCase.execute.mockResolvedValue({
      id: 'user-1',
      email: 'cliente@example.com',
      userName: 'cliente1',
      firstName: 'Juan',
      paternalLastName: 'Pérez',
      maternalLastName: '',
      role: 'user',
      isEmailVerified: true,
    });
    getQrUseCase.execute.mockResolvedValue({
      id: 'qr-doc-2',
      idQr: 'def456',
      userId: 'user-1',
      typeQr: 'list',
      name: 'Mi QR Multi links',
      data: { typeQr: 'list' },
    });
    const activationList: QrActivate = {
      ...mockActivation,
      qrList: [{ ...mockActivation.qrList[0], qrCode: 'def456' }],
    };

    await service.notify(activationList, tracking);

    const payload = emailSender.sendQrActivatedEmail.mock.calls[0][0];
    expect(payload.qrItems[0].typeLabel).toBe('QR Multi links');
    expect(payload.qrItems[0].name).toBe('Mi QR Multi links');
  });

  it('debe usar createdAt como fallback de activationDate cuando no está persistida', async () => {
    getUserUseCase.execute.mockResolvedValue({
      id: 'user-1',
      email: 'cliente@example.com',
      userName: 'cliente1',
      firstName: 'Juan',
      paternalLastName: 'Pérez',
      maternalLastName: '',
      role: 'user',
      isEmailVerified: true,
    });
    getQrUseCase.execute.mockResolvedValue({
      id: 'qr-doc-1',
      idQr: 'abc123',
      userId: 'user-1',
      typeQr: 'dynamic',
      data: { typeQr: 'dynamic' },
    });
    const activationSinFecha: QrActivate = { ...mockActivation, activationDate: undefined };

    await service.notify(activationSinFecha, tracking);

    const payload = emailSender.sendQrActivatedEmail.mock.calls[0][0];
    expect(payload.qrItems[0].activationDate).toEqual(mockActivation.createdAt);
  });

  it('debe omitir el envío con warn si el usuario dueño no existe (RN-4)', async () => {
    getUserUseCase.execute.mockRejectedValue(new NotFoundException('Usuario no encontrado'));

    await service.notify(mockActivation, tracking);

    expect(emailSender.sendQrActivatedEmail).not.toHaveBeenCalled();
    expect(traceService.warn).toHaveBeenCalledWith(
      tracking,
      TraceLayer.SERVICE,
      expect.stringContaining('usuario inexistente'),
      expect.objectContaining({ activationId: 'act-1', userId: 'user-1' }),
    );
  });

  it('debe loguear email_activation_failed sin re-throw si SMTP falla (ADR-019.2)', async () => {
    getUserUseCase.execute.mockResolvedValue({
      id: 'user-1',
      email: 'cliente@example.com',
      userName: 'cliente1',
      firstName: 'Juan',
      paternalLastName: 'Pérez',
      maternalLastName: '',
      role: 'user',
      isEmailVerified: true,
    });
    getQrUseCase.execute.mockResolvedValue({
      id: 'qr-doc-1',
      idQr: 'abc123',
      userId: 'user-1',
      typeQr: 'dynamic',
      data: { typeQr: 'dynamic' },
    });
    emailSender.sendQrActivatedEmail.mockRejectedValue(new Error('SMTP caído'));

    await expect(service.notify(mockActivation, tracking)).resolves.toBeUndefined();

    expect(traceService.error).toHaveBeenCalledWith(
      tracking,
      TraceLayer.SERVICE,
      expect.stringContaining('email_activation_failed'),
      expect.objectContaining({ message: 'SMTP caído' }),
    );
  });

  it('debe loguear email_activation_failed sin re-throw si un QR no existe', async () => {
    getUserUseCase.execute.mockResolvedValue({
      id: 'user-1',
      email: 'cliente@example.com',
      userName: 'cliente1',
      firstName: 'Juan',
      paternalLastName: 'Pérez',
      maternalLastName: '',
      role: 'user',
      isEmailVerified: true,
    });
    getQrUseCase.execute.mockRejectedValue(new NotFoundException('QR no encontrado: abc123'));

    await expect(service.notify(mockActivation, tracking)).resolves.toBeUndefined();

    expect(emailSender.sendQrActivatedEmail).not.toHaveBeenCalled();
    expect(traceService.error).toHaveBeenCalledWith(
      tracking,
      TraceLayer.SERVICE,
      expect.stringContaining('email_activation_failed'),
      expect.objectContaining({ message: 'QR no encontrado: abc123' }),
    );
  });
});