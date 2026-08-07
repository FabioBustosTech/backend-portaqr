import {
  UserResponse,
  QrCodeResponse,
  PlanResponse,
  QrElementResponse,
  QrActivateResponse,
  PaginatedQrActivateResponse,
} from './qr-activate-response.dto';

describe('DTOs de respuesta de activación QR', () => {
  describe('UserResponse', () => {
    it('debe instanciarse con _id, email y name', () => {
      const dto = new UserResponse();
      dto._id = '64f0e123456789abcdef0123';
      dto.email = 'user@example.com';
      dto.name = 'John Doe';

      expect(dto).toBeInstanceOf(UserResponse);
      expect(dto._id).toBe('64f0e123456789abcdef0123');
      expect(dto.email).toBe('user@example.com');
      expect(dto.name).toBe('John Doe');
    });
  });

  describe('QrCodeResponse', () => {
    it('debe instanciarse con _id, name y code', () => {
      const dto = new QrCodeResponse();
      dto._id = '64f0e123456789abcdef0123';
      dto.name = 'QR123';
      dto.code = 'QR123';

      expect(dto).toBeInstanceOf(QrCodeResponse);
      expect(dto.name).toBe('QR123');
      expect(dto.code).toBe('QR123');
    });
  });

  describe('PlanResponse', () => {
    it('debe instanciarse con _id, name y description', () => {
      const dto = new PlanResponse();
      dto._id = '64f0e123456789abcdef0123';
      dto.name = 'Basic Plan';
      dto.description = 'Basic plan description';

      expect(dto).toBeInstanceOf(PlanResponse);
      expect(dto.name).toBe('Basic Plan');
      expect(dto.description).toBe('Basic plan description');
    });
  });

  describe('QrElementResponse', () => {
    it('debe instanciarse con qrCode y plan', () => {
      const qrCode = new QrCodeResponse();
      qrCode._id = 'qr-1';
      qrCode.name = 'QR1';
      qrCode.code = 'QR1';

      const plan = new PlanResponse();
      plan._id = 'plan-1';
      plan.name = 'Plan';
      plan.description = 'Desc';

      const dto = new QrElementResponse();
      dto.qrCode = qrCode;
      dto.plan = plan;

      expect(dto).toBeInstanceOf(QrElementResponse);
      expect(dto.qrCode).toBe(qrCode);
      expect(dto.plan).toBe(plan);
    });
  });

  describe('QrActivateResponse', () => {
    it('debe instanciarse con todos los campos', () => {
      const user = new UserResponse();
      user._id = 'user-1';
      user.email = 'a@b.cl';
      user.name = 'Ana';

      const qrCode = new QrCodeResponse();
      qrCode._id = 'qr-1';
      qrCode.name = 'QR1';
      qrCode.code = 'QR1';

      const plan = new PlanResponse();
      plan._id = 'plan-1';
      plan.name = 'Plan';
      plan.description = 'Desc';

      const element = new QrElementResponse();
      element.qrCode = qrCode;
      element.plan = plan;

      const dto = new QrActivateResponse();
      dto._id = 'act-1';
      dto.methodActivation = 'WEBPAY';
      dto.state = 'ACTIVO';
      dto.userId = user;
      dto.qrList = [element];
      dto.adminId = user;

      expect(dto).toBeInstanceOf(QrActivateResponse);
      expect(dto.methodActivation).toBe('WEBPAY');
      expect(dto.state).toBe('ACTIVO');
      expect(dto.userId).toBe(user);
      expect(dto.qrList).toHaveLength(1);
      expect(dto.adminId).toBe(user);
    });

    it('debe aceptar cualquiera de los métodos de activación', () => {
      for (const method of ['WEBPAY', 'TRANSFER', 'ADMIN']) {
        const dto = new QrActivateResponse();
        dto.methodActivation = method;
        expect(dto.methodActivation).toBe(method);
      }
    });
  });

  describe('PaginatedQrActivateResponse', () => {
    it('debe instanciarse con data y pagination', () => {
      const dto = new PaginatedQrActivateResponse();
      dto.data = [];
      dto.pagination = {
        total: 0,
        totalPages: 0,
        currentPage: 1,
        limit: 10,
        hasNextPage: false,
        hasPrevPage: false,
      };

      expect(dto).toBeInstanceOf(PaginatedQrActivateResponse);
      expect(dto.data).toEqual([]);
      expect(dto.pagination.currentPage).toBe(1);
      expect(dto.pagination.limit).toBe(10);
      expect(dto.pagination.hasNextPage).toBe(false);
      expect(dto.pagination.hasPrevPage).toBe(false);
    });
  });
});