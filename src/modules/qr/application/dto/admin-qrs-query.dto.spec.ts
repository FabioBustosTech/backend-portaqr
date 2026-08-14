import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AdminQrsQueryDto } from './admin-qrs-query.dto';
import { QrType } from './create-qr.dto';

describe('AdminQrsQueryDto (SPEC-015)', () => {
  async function validateDto(body: Record<string, unknown>) {
    const dto = plainToInstance(AdminQrsQueryDto, body);
    return validate(dto);
  }

  it('debe aceptar un query vacío (defaults de PaginationDto y active="all")', async () => {
    const errors = await validateDto({});
    expect(errors).toHaveLength(0);
    const dto = plainToInstance(AdminQrsQueryDto, {});
    // PaginationDto asigna page=1/limit=10; AdminQrsQueryDto asigna active='all'
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
    expect(dto.active).toBe('all');
  });

  it('debe aceptar active con valores válidos del enum', async () => {
    for (const value of ['all', 'active', 'inactive', 'deactivated']) {
      const errors = await validateDto({ active: value });
      expect(errors).toHaveLength(0);
    }
  });

  it('debe rechazar active con valor inválido', async () => {
    const errors = await validateDto({ active: 'foo' });
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints?.isIn).toBeDefined();
  });

  it('debe aceptar type con valores válidos del enum QrType', async () => {
    for (const value of Object.values(QrType)) {
      const errors = await validateDto({ type: value });
      expect(errors).toHaveLength(0);
    }
  });

  it('debe rechazar type con valor inválido', async () => {
    const errors = await validateDto({ type: 'not-a-type' });
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints?.isEnum).toBeDefined();
  });

  it('debe aceptar userId como ObjectId válido', async () => {
    const errors = await validateDto({ userId: '507f1f77bcf86cd799439011' });
    expect(errors).toHaveLength(0);
  });

  it('debe rechazar userId que no es ObjectId', async () => {
    const errors = await validateDto({ userId: 'abc' });
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints?.isMongoId).toBeDefined();
  });

  it('debe aceptar combinaciones de filtros (active + type + userId + page/limit/search)', async () => {
    const errors = await validateDto({
      page: 2,
      limit: 25,
      search: 'juan',
      active: 'deactivated',
      type: 'whatsapp',
      userId: '507f1f77bcf86cd799439011',
    });
    expect(errors).toHaveLength(0);
  });

  it('debe rechazar page/limit fuera de rango (heredado de PaginationDto)', async () => {
    const errorsPage = await validateDto({ page: 0 });
    expect(errorsPage).toHaveLength(1);
    const errorsLimit = await validateDto({ limit: 101 });
    expect(errorsLimit).toHaveLength(1);
  });
});
