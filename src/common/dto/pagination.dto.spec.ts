import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PaginationDto } from './pagination.dto';

describe('PaginationDto', () => {
  it('debe aplicar los valores por defecto page=1 y limit=10', () => {
    const dto = plainToInstance(PaginationDto, {});

    expect(dto).toBeInstanceOf(PaginationDto);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
  });

  it('debe transformar page y limit a número cuando vienen como string', async () => {
    const dto = plainToInstance(PaginationDto, { page: '2', limit: '20' });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(20);
  });

  it('debe aceptar un payload válido con search, sortBy y sortOrder', async () => {
    const dto = plainToInstance(PaginationDto, {
      page: 1,
      limit: 50,
      search: 'usuario',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.search).toBe('usuario');
    expect(dto.sortBy).toBe('createdat');
    expect(dto.sortOrder).toBe('desc');
  });

  it('debe fallar cuando page es menor que 1', async () => {
    const dto = plainToInstance(PaginationDto, { page: 0 });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('debe fallar cuando limit excede 100', async () => {
    const dto = plainToInstance(PaginationDto, { limit: 101 });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('debe fallar cuando sortOrder no es asc o desc', async () => {
    const dto = plainToInstance(PaginationDto, { sortOrder: 'sideways' });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('debe transformar sortBy a minúsculas y sin espacios', () => {
    const dto = plainToInstance(PaginationDto, { sortBy: '  CreatedAt  ' });

    expect(dto.sortBy).toBe('createdat');
  });

  it('debe dejar sortBy como undefined cuando no es string', () => {
    const dto = plainToInstance(PaginationDto, { sortBy: 123 });

    expect(dto.sortBy).toBeUndefined();
  });
});