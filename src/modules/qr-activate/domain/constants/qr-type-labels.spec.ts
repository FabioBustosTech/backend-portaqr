import { QR_TYPE_LABELS, getQrTypeLabel } from './qr-type-labels';
import { QrType } from '../../../qr/application/dto/create-qr.dto';

describe('QR_TYPE_LABELS (SPEC-019 RF-1.1)', () => {
  it('cubre los 12 tipos del enum QrType', () => {
    const enumValues = Object.values(QrType);
    expect(enumValues).toHaveLength(12);
    for (const value of enumValues) {
      expect(QR_TYPE_LABELS[value]).toBeDefined();
    }
  });

  it('mapea cada tipo a su label legible', () => {
    expect(QR_TYPE_LABELS[QrType.DYNAMIC]).toBe('QR Dinámico');
    expect(QR_TYPE_LABELS[QrType.STATIC]).toBe('QR URL Estática');
    expect(QR_TYPE_LABELS[QrType.WHATSAPP]).toBe('QR WhatsApp');
    expect(QR_TYPE_LABELS[QrType.EMAIL]).toBe('QR Correo electrónico');
    expect(QR_TYPE_LABELS[QrType.CALL]).toBe('QR Llamada');
    expect(QR_TYPE_LABELS[QrType.WIFI]).toBe('QR WiFi');
    expect(QR_TYPE_LABELS[QrType.TEXTO]).toBe('QR Texto');
    expect(QR_TYPE_LABELS[QrType.LIST]).toBe('QR Multi links');
    expect(QR_TYPE_LABELS[QrType.VCARD]).toBe('QR Tarjeta de contacto');
    expect(QR_TYPE_LABELS[QrType.PET]).toBe('QR Mascota');
    expect(QR_TYPE_LABELS[QrType.PHONE]).toBe('QR Teléfono');
    expect(QR_TYPE_LABELS[QrType.MAP]).toBe('QR Mapa');
  });

  describe('getQrTypeLabel', () => {
    it('resuelve el label de un tipo conocido', () => {
      expect(getQrTypeLabel('dynamic')).toBe('QR Dinámico');
      expect(getQrTypeLabel('list')).toBe('QR Multi links');
    });

    it('devuelve el valor crudo como fallback para tipos desconocidos', () => {
      expect(getQrTypeLabel('tipo-desconocido')).toBe('tipo-desconocido');
      expect(getQrTypeLabel('')).toBe('');
    });
  });
});