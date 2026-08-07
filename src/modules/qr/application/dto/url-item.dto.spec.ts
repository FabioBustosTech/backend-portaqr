import { UrlListItem } from './url-item.dto';

describe('UrlListItem', () => {
  it('debe instanciarse con typeUrl y url', () => {
    const dto = new UrlListItem();
    dto.typeUrl = 'URL';
    dto.url = 'https://example.com';

    expect(dto).toBeInstanceOf(UrlListItem);
    expect(dto.typeUrl).toBe('URL');
    expect(dto.url).toBe('https://example.com');
    expect(dto.vcard).toBeUndefined();
  });

  it('debe instanciarse con typeUrl y vcard', () => {
    const dto = new UrlListItem();
    dto.typeUrl = 'VCARD';
    dto.vcard = {
      version: '4.0',
      fn: 'Juan Pérez',
      phones: [{ type: 'cell', value: '+56912345678' }],
    };

    expect(dto).toBeInstanceOf(UrlListItem);
    expect(dto.typeUrl).toBe('VCARD');
    expect(dto.vcard.fn).toBe('Juan Pérez');
    expect(dto.url).toBeUndefined();
  });

  it('debe requerir typeUrl', () => {
    const dto = new UrlListItem();
    dto.url = 'https://example.com';

    expect(dto.typeUrl).toBeUndefined();
    expect(dto.url).toBe('https://example.com');
  });
});