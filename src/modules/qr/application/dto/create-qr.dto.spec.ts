import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ListUrlData } from './create-qr.dto';

describe('ListUrlData — title (SPEC-022 RF-1/RF-3)', () => {
  const pdfBase = { typeUrl: 'pdf', documentUrl: 'https://images.portaqr.cl/qr-multilink-pdf/qr-1-item-1.pdf' };

  it('acepta title válido (<= 60) en item pdf', async () => {
    const dto = plainToInstance(ListUrlData, { ...pdfBase, title: 'Menú' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('acepta title de exactamente 60 caracteres', async () => {
    const dto = plainToInstance(ListUrlData, { ...pdfBase, title: 'a'.repeat(60) });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rechaza title de más de 60 caracteres (@MaxLength)', async () => {
    const dto = plainToInstance(ListUrlData, { ...pdfBase, title: 'a'.repeat(61) });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('title');
    expect(errors[0].constraints?.maxLength).toContain('60');
  });

  it('acepta item pdf sin title (opcional)', async () => {
    const dto = plainToInstance(ListUrlData, pdfBase);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('ignora title en item no-pdf (@ValidateIf typeUrl === pdf)', async () => {
    const dto = plainToInstance(ListUrlData, { typeUrl: 'web', url: 'https://a.cl', title: 'Menú' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});