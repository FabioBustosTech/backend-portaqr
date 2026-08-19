import { isValidQrData } from './qr.schema';

const VALID_PDF_URL = 'https://images.portaqr.cl/qr-multilink-pdf/qr-1-item-1.pdf';

describe('isValidQrData — case list (SPEC-005 RF-4/RF-5)', () => {
  const base = {
    typeQr: 'list',
    urlList: [
      { itemId: 'i1', typeUrl: 'web', url: 'https://a.cl' },
    ],
  };

  beforeEach(() => {
    delete process.env.MAX_PDF_ITEMS_PER_QR;
  });

  it('acepta un QR list legacy con items url (sin regresión)', () => {
    expect(isValidQrData(base)).toBe(true);
  });

  it('acepta un QR list con item vcard legacy', () => {
    expect(isValidQrData({
      ...base,
      urlList: [{ typeUrl: 'vcard', vcard: { fn: 'Juan' } }],
    })).toBe(true);
  });

  it('acepta un item pdf válido con documentUrl y sin url/vcard', () => {
    expect(isValidQrData({
      ...base,
      urlList: [
        { itemId: 'i1', typeUrl: 'pdf', documentUrl: VALID_PDF_URL },
      ],
    })).toBe(true);
  });

  it('acepta items mixtos url + vcard + pdf', () => {
    expect(isValidQrData({
      ...base,
      urlList: [
        { itemId: 'i1', typeUrl: 'web', url: 'https://a.cl' },
        { itemId: 'i2', typeUrl: 'vcard', vcard: { fn: 'Ana' } },
        { itemId: 'i3', typeUrl: 'pdf', documentUrl: VALID_PDF_URL },
      ],
    })).toBe(true);
  });

  it('rechaza item pdf sin documentUrl', () => {
    expect(isValidQrData({
      ...base,
      urlList: [{ itemId: 'i1', typeUrl: 'pdf' }],
    })).toBe(false);
  });

  it('rechaza item pdf con url', () => {
    expect(isValidQrData({
      ...base,
      urlList: [
        { itemId: 'i1', typeUrl: 'pdf', documentUrl: VALID_PDF_URL, url: 'https://a.cl' },
      ],
    })).toBe(false);
  });

  it('rechaza item pdf con vcard', () => {
    expect(isValidQrData({
      ...base,
      urlList: [
        { itemId: 'i1', typeUrl: 'pdf', documentUrl: VALID_PDF_URL, vcard: { fn: 'X' } },
      ],
    })).toBe(false);
  });

  it('rechaza item url con documentUrl', () => {
    expect(isValidQrData({
      ...base,
      urlList: [
        { itemId: 'i1', typeUrl: 'web', url: 'https://a.cl', documentUrl: VALID_PDF_URL },
      ],
    })).toBe(false);
  });

  it('rechaza item vcard con documentUrl', () => {
    expect(isValidQrData({
      ...base,
      urlList: [
        { itemId: 'i1', typeUrl: 'vcard', vcard: { fn: 'X' }, documentUrl: VALID_PDF_URL },
      ],
    })).toBe(false);
  });

  it('rechaza item vcard sin vcard', () => {
    expect(isValidQrData({
      ...base,
      urlList: [{ itemId: 'i1', typeUrl: 'vcard' }],
    })).toBe(false);
  });

  it('rechaza item vcard con url (exclusividad de campos)', () => {
    expect(isValidQrData({
      ...base,
      urlList: [
        { itemId: 'i1', typeUrl: 'vcard', vcard: { fn: 'X' }, url: 'https://a.cl' },
      ],
    })).toBe(false);
  });

  // SPEC-022 RF-4: exclusividad del título — solo items pdf
  it('acepta item pdf con title (SPEC-022 RF-4)', () => {
    expect(isValidQrData({
      ...base,
      urlList: [
        { itemId: 'i1', typeUrl: 'pdf', documentUrl: VALID_PDF_URL, title: 'Menú' },
      ],
    })).toBe(true);
  });

  it('acepta 2 items pdf con titles independientes (SPEC-022 CA-11)', () => {
    expect(isValidQrData({
      ...base,
      urlList: [
        { itemId: 'i1', typeUrl: 'pdf', documentUrl: VALID_PDF_URL, title: 'Menú' },
        { itemId: 'i2', typeUrl: 'pdf', documentUrl: VALID_PDF_URL, title: 'Catálogo' },
      ],
    })).toBe(true);
  });

  it('rechaza item url/web con title (SPEC-022 RF-4)', () => {
    expect(isValidQrData({
      ...base,
      urlList: [
        { itemId: 'i1', typeUrl: 'web', url: 'https://a.cl', title: 'Menú' },
      ],
    })).toBe(false);
  });

  it('rechaza item vcard con title (SPEC-022 RF-4)', () => {
    expect(isValidQrData({
      ...base,
      urlList: [
        { itemId: 'i1', typeUrl: 'vcard', vcard: { fn: 'X' }, title: 'Menú' },
      ],
    })).toBe(false);
  });

  it('rechaza item url/web con vcard (exclusividad de campos)', () => {
    expect(isValidQrData({
      ...base,
      urlList: [
        { itemId: 'i1', typeUrl: 'web', url: 'https://a.cl', vcard: { fn: 'X' } },
      ],
    })).toBe(false);
  });

  it('rechaza item genérico sin url', () => {
    expect(isValidQrData({
      ...base,
      urlList: [{ itemId: 'i1', typeUrl: 'web' }],
    })).toBe(false);
  });

  it('rechaza urlList con más de MAX_PDF_ITEMS_PER_QR (default 2) items pdf', () => {
    expect(isValidQrData({
      ...base,
      urlList: [
        { itemId: 'i1', typeUrl: 'pdf', documentUrl: VALID_PDF_URL },
        { itemId: 'i2', typeUrl: 'pdf', documentUrl: VALID_PDF_URL },
        { itemId: 'i3', typeUrl: 'pdf', documentUrl: VALID_PDF_URL },
      ],
    })).toBe(false);
  });

  it('acepta exactamente el límite de items pdf (2 por default)', () => {
    expect(isValidQrData({
      ...base,
      urlList: [
        { itemId: 'i1', typeUrl: 'pdf', documentUrl: VALID_PDF_URL },
        { itemId: 'i2', typeUrl: 'pdf', documentUrl: VALID_PDF_URL },
      ],
    })).toBe(true);
  });

  it('respeta MAX_PDF_ITEMS_PER_QR configurado por env (límite 5)', () => {
    process.env.MAX_PDF_ITEMS_PER_QR = '5';
    const urlList = Array.from({ length: 5 }, (_, idx) => ({
      itemId: `i${idx}`,
      typeUrl: 'pdf',
      documentUrl: VALID_PDF_URL,
    }));
    expect(isValidQrData({ ...base, urlList })).toBe(true);

    urlList.push({ itemId: 'i5', typeUrl: 'pdf', documentUrl: VALID_PDF_URL });
    expect(isValidQrData({ ...base, urlList })).toBe(false);
  });

  it('ignora el límite si env no es un número positivo (fallback 2)', () => {
    process.env.MAX_PDF_ITEMS_PER_QR = 'abc';
    expect(isValidQrData({
      ...base,
      urlList: [
        { itemId: 'i1', typeUrl: 'pdf', documentUrl: VALID_PDF_URL },
        { itemId: 'i2', typeUrl: 'pdf', documentUrl: VALID_PDF_URL },
        { itemId: 'i3', typeUrl: 'pdf', documentUrl: VALID_PDF_URL },
      ],
    })).toBe(false);
  });

  it('rechaza list sin urlList', () => {
    expect(isValidQrData({ typeQr: 'list' })).toBe(false);
  });

  it('rechaza list con campos exclusivos a nivel de QR (url)', () => {
    expect(isValidQrData({ ...base, url: 'https://a.cl' })).toBe(false);
  });
});

describe('isValidQrData — otros typeQr (sin regresión)', () => {
  it('dynamic/static siguen validando url', () => {
    expect(isValidQrData({ typeQr: 'dynamic', url: 'https://a.cl' })).toBe(true);
    expect(isValidQrData({ typeQr: 'dynamic' })).toBe(false);
    expect(isValidQrData({ typeQr: 'static', url: 'https://a.cl', urlList: [] })).toBe(false);
  });

  it('whatsapp/email/call/wifi/texto/phone/map siguen validando su campo', () => {
    expect(isValidQrData({ typeQr: 'whatsapp', whatsappUrl: 'https://wa.me/56912345678' })).toBe(true);
    expect(isValidQrData({ typeQr: 'email', emailUrl: 'mailto:a@b.cl' })).toBe(true);
    expect(isValidQrData({ typeQr: 'call', phoneUrl: 'tel:56912345678' })).toBe(true);
    expect(isValidQrData({ typeQr: 'wifi', wifiData: { ssid: 'x', security: 'WPA', password: 'y' } })).toBe(true);
    expect(isValidQrData({ typeQr: 'texto', text: 'hola' })).toBe(true);
    expect(isValidQrData({ typeQr: 'phone', phoneUrl: 'tel:56912345678' })).toBe(true);
    expect(isValidQrData({ typeQr: 'map', mapUrl: 'https://maps.google.com' })).toBe(true);
  });

  it('vcard/pet siguen validando su campo', () => {
    expect(isValidQrData({ typeQr: 'vcard', vcardData: { fn: 'X' } })).toBe(true);
    expect(isValidQrData({ typeQr: 'pet', petData: { ownerName: 'A' } })).toBe(true);
  });

  it('typeQr desconocido → inválido', () => {
    expect(isValidQrData({ typeQr: 'alien', url: 'https://a.cl' })).toBe(false);
  });
});
