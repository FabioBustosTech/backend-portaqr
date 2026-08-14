import { validate } from 'class-validator';
import { DeactivateQrDto } from './deactivate-qr.dto';

describe('DeactivateQrDto (SPEC-014)', () => {
  const makeDto = (reason: unknown): DeactivateQrDto => {
    const dto = new DeactivateQrDto();
    (dto as any).reason = reason;
    return dto;
  };

  it('acepta un motivo válido (5-500 chars)', async () => {
    const dto = makeDto('Cliente no renovó el plan');
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rechaza motivo vacío', async () => {
    const dto = makeDto('');
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rechaza motivo de menos de 5 caracteres', async () => {
    const dto = makeDto('abc');
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rechaza motivo de más de 500 caracteres', async () => {
    const dto = makeDto('a'.repeat(501));
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rechaza motivo que no es string', async () => {
    const dto = makeDto(12345);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rechaza motivo undefined (obligatorio)', async () => {
    const dto = makeDto(undefined);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
