import { Test, TestingModule } from '@nestjs/testing';
import { CreateQrActivateUseCase } from './create-qr-activate.usecase';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import {
  QR_ACTIVATE_CREATE_PORT,
  QR_ACTIVATE_QR_PORT,
} from '../../domain/constants/qr-activate.tokens';
import type {
  ICanCreateQrActivate,
  ICanActivateQr,
} from '../../domain/ports/queries/qr-activate.port';
import { QrActivateEntity } from '../../domain/entities/qr-activate.entity';
import {
  MethodActivation,
  ActivationState,
  DocumentType,
  WebpayState,
} from '../../domain/entities/qr-activate.entity';
import type { QrActivate } from '../../domain/entities/qr-activate.entity';
import { CreateQrActivateDto } from '../dto/create-qr-activate.dto';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';

describe('CreateQrActivateUseCase', () => {
  let useCase: CreateQrActivateUseCase;
  let creator: jest.Mocked<ICanCreateQrActivate>;
  let qrActivator: jest.Mocked<ICanActivateQr>;
  let traceService: jest.Mocked<TraceService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };
  // SPEC-009 A3: el actor (del token) decide userId/state por rol
  const actor = { id: 'user-1', role: 'user' };

  const expirationDate = new Date('2024-12-31T23:59:59.999Z');

  const dto: CreateQrActivateDto = {
    methodActivation: MethodActivation.WEBPAY,
    webpayToken: 'tx-1',
    price: { TotalPrice: 100, TotalTax: 19 },
    qrList: [
      {
        qrCode: 'qr-1',
        price: 100,
        expirationDate,
        duration: '12 meses',
      },
    ],
    userId: 'user-1',
    description: 'Activación de prueba',
    adminId: 'admin-1',
    descriptionAdministrator: 'Creada por admin',
    documentType: DocumentType.BOLETA,
    sendDocument: false,
  };

  const mockActivation: QrActivate = {
    id: 'act-1',
    methodActivation: MethodActivation.WEBPAY,
    state: ActivationState.PENDING,
    price: { TotalPrice: 100, TotalTax: 19 },
    userId: 'user-1',
    qrList: [
      {
        qrCode: 'qr-1',
        price: 100,
        expirationDate,
        duration: '12 meses',
      },
    ],
    documentType: DocumentType.BOLETA,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateQrActivateUseCase,
        {
          provide: QR_ACTIVATE_CREATE_PORT,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: QR_ACTIVATE_QR_PORT,
          useValue: {
            updateQr: jest.fn(),
            activateMany: jest.fn(),
          },
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

    useCase = module.get<CreateQrActivateUseCase>(CreateQrActivateUseCase);
    creator = module.get(QR_ACTIVATE_CREATE_PORT);
    qrActivator = module.get(QR_ACTIVATE_QR_PORT);
    traceService = module.get(TraceService);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe crear la entidad de activación y delegar al puerto de creación', async () => {
      creator.create.mockResolvedValue(mockActivation);

      const result = await useCase.execute(dto, actor, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'CreateQrActivateUseCase',
        { methodActivation: dto.methodActivation },
      );
      expect(creator.create).toHaveBeenCalledTimes(1);
      const createdEntity = creator.create.mock.calls[0][0];
      expect(createdEntity).toBeInstanceOf(QrActivateEntity);
      expect(createdEntity.methodActivation).toBe(MethodActivation.WEBPAY);
      // SPEC-009 A3: el state lo fija el usecase (no viene del body)
      expect(createdEntity.state).toBe(ActivationState.PENDING);
      // SPEC-009 A3: WebpayTransaction se arma desde webpayToken (solo el token en la entrada)
      expect(createdEntity.WebpayTransaction).toEqual({
        id: 'tx-1',
        date: expect.any(Date),
        state: WebpayState.INITIAL,
      });
      expect(createdEntity.price).toEqual(dto.price);
      expect(createdEntity.userId).toBe('user-1');
      expect(createdEntity.documentType).toBe(DocumentType.BOLETA);
      expect(createdEntity.qrList).toEqual([
        {
          qrCode: 'qr-1',
          price: 100,
          expirationDate,
          duration: '12 meses',
        },
      ]);
      expect(createdEntity.createdAt).toBeInstanceOf(Date);
      expect(creator.create).toHaveBeenCalledWith(createdEntity, tracking);
      expect(result).toEqual(mockActivation);
    });

    it('debe propagar el error si el puerto de creación falla', async () => {
      creator.create.mockRejectedValue(new Error('DB down'));

      await expect(useCase.execute(dto, actor, tracking)).rejects.toThrow('DB down');
    });
  });

  describe('executeAdmin', () => {
    it('debe crear la activación y activar los QRs en 1 operación batch', async () => {
      creator.create.mockResolvedValue(mockActivation);
      qrActivator.activateMany.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

      const result = await useCase.executeAdmin(dto, actor, tracking);

      expect(traceService.log).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'CreateQrActivateUseCase - admin',
        { methodActivation: dto.methodActivation },
      );
      expect(creator.create).toHaveBeenCalledTimes(1);
      expect(qrActivator.activateMany).toHaveBeenCalledTimes(1);
      expect(qrActivator.activateMany).toHaveBeenCalledWith(
        ['qr-1'],
        expirationDate,
        tracking,
      );
      expect(qrActivator.updateQr).not.toHaveBeenCalled();
      expect(result).toEqual(mockActivation);
    });

    it('debe activar todos los QR cuando la lista tiene varios elementos (1 sola llamada batch)', async () => {
      const multiQrDto: CreateQrActivateDto = {
        ...dto,
        qrList: [
          { qrCode: 'qr-1', price: 50, expirationDate, duration: '6 meses' },
          { qrCode: 'qr-2', price: 50, expirationDate, duration: '6 meses' },
        ],
      };
      creator.create.mockResolvedValue(mockActivation);
      qrActivator.activateMany.mockResolvedValue({ matchedCount: 2, modifiedCount: 2 });

      await useCase.executeAdmin(multiQrDto, actor, tracking);

      expect(qrActivator.activateMany).toHaveBeenCalledTimes(1);
      expect(qrActivator.activateMany).toHaveBeenCalledWith(
        ['qr-1', 'qr-2'],
        expirationDate,
        tracking,
      );
    });

    it('debe avisar con warn si hay QRs inexistentes (matchedCount < total, no fatal)', async () => {
      const multiQrDto: CreateQrActivateDto = {
        ...dto,
        qrList: [
          { qrCode: 'qr-1', price: 50, expirationDate, duration: '6 meses' },
          { qrCode: 'qr-inexistente', price: 50, expirationDate, duration: '6 meses' },
        ],
      };
      creator.create.mockResolvedValue(mockActivation);
      qrActivator.activateMany.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

      const result = await useCase.executeAdmin(multiQrDto, actor, tracking);

      expect(traceService.warn).toHaveBeenCalledWith(
        tracking,
        TraceLayer.USE_CASE,
        'CreateQrActivateUseCase - QRs inexistentes',
        { total: 2, matchedCount: 1, modifiedCount: 1 },
      );
      expect(result).toEqual(mockActivation);
    });

    it('no debe llamar a activateMany si la lista de QR está vacía', async () => {
      const emptyQrDto: CreateQrActivateDto = {
        ...dto,
        qrList: [],
      };
      creator.create.mockResolvedValue(mockActivation);

      await useCase.executeAdmin(emptyQrDto, actor, tracking);

      expect(qrActivator.activateMany).not.toHaveBeenCalled();
    });

    it('debe propagar el error si la creación falla y no activar QRs', async () => {
      creator.create.mockRejectedValue(new Error('DB down'));

      await expect(useCase.executeAdmin(dto, actor, tracking)).rejects.toThrow('DB down');
      expect(qrActivator.activateMany).not.toHaveBeenCalled();
    });

    it('debe propagar el error si la activación batch falla (no se guarda estado sin activar)', async () => {
      creator.create.mockResolvedValue(mockActivation);
      qrActivator.activateMany.mockRejectedValue(new Error('DB down'));

      await expect(useCase.executeAdmin(dto, actor, tracking)).rejects.toThrow('DB down');
    });
  });
});