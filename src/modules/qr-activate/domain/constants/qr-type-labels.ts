import { QrType } from '../../../qr/application/dto/create-qr.dto';

/**
 * SPEC-019 RF-1.1: labels legibles de los tipos de QR para el correo de activación.
 * Mismo formato de labels que `qr-app/src/constants/qrTypes.ts` (los tipos `phone` y
 * `map` no existen en ese mapa del frontend — se agregan aquí).
 */
export const QR_TYPE_LABELS: Record<QrType, string> = {
  [QrType.DYNAMIC]: 'QR Dinámico',
  [QrType.STATIC]: 'QR URL Estática',
  [QrType.WHATSAPP]: 'QR WhatsApp',
  [QrType.EMAIL]: 'QR Correo electrónico',
  [QrType.CALL]: 'QR Llamada',
  [QrType.WIFI]: 'QR WiFi',
  [QrType.TEXTO]: 'QR Texto',
  [QrType.LIST]: 'QR Multi links',
  [QrType.VCARD]: 'QR Tarjeta de contacto',
  [QrType.PET]: 'QR Mascota',
  [QrType.PHONE]: 'QR Teléfono',
  [QrType.MAP]: 'QR Mapa',
};

/** Resuelve el label legible de un `typeQr`; fallback: valor crudo (RF-1.1). */
export function getQrTypeLabel(typeQr: string): string {
  return QR_TYPE_LABELS[typeQr as QrType] ?? typeQr;
}