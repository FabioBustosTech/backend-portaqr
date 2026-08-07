import { QrAggregate } from './qr.aggregate';
import type { QrSnapshot } from './qr.aggregate';
import type { QrData } from '../entities/qr.entity';

describe('QrAggregate', () => {
  const snapshot: QrSnapshot = {
    id: 'qr-id-1',
    idQr: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'user-1',
    expiration: new Date('2025-12-31T23:59:59.999Z'),
    quantityUpdateMonth: 5,
    description: 'Descripción de prueba',
    data: { typeQr: 'dynamic', url: 'https://example.com' } as QrData,
    name: 'QR de prueba',
    updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    active: true,
    isFavorite: false,
    isOldMode: false,
    typeQr: 'dynamic',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  describe('crear', () => {
    it('debe crear un agregado con valores por defecto (active, isFavorite, isOldMode = false)', () => {
      const agg = QrAggregate.crear({
        idQr: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'user-1',
        typeQr: 'dynamic',
        data: { typeQr: 'dynamic', url: 'https://example.com' },
      });

      expect(agg.active).toBe(false);
      expect(agg.isFavorite).toBe(false);
      expect(agg.isOldMode).toBe(false);
      expect(agg.createdAt).toBeInstanceOf(Date);
      expect(agg.updatedAt).toBeUndefined();
    });

    it('debe generar un id UUID v4 cuando no se provee uno', () => {
      const agg = QrAggregate.crear({
        idQr: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'user-1',
        typeQr: 'dynamic',
        data: { typeQr: 'dynamic', url: 'https://example.com' },
      });

      expect(agg.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('debe conservar el id cuando se provee uno', () => {
      const agg = QrAggregate.crear({
        id: 'id-personalizado',
        idQr: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'user-1',
        typeQr: 'dynamic',
        data: { typeQr: 'dynamic', url: 'https://example.com' },
      });

      expect(agg.id).toBe('id-personalizado');
    });

    it('debe usar los valores provistos', () => {
      const agg = QrAggregate.crear({
        idQr: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'user-1',
        expiration: snapshot.expiration,
        quantityUpdateMonth: 3,
        description: 'Desc',
        name: 'Nombre',
        active: true,
        isFavorite: true,
        isOldMode: true,
        typeQr: 'wifi',
        data: {
          typeQr: 'wifi',
          wifiData: { ssid: 'red', security: 'WPA2', password: 'pass' },
        },
      });

      expect(agg.idQr).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(agg.userId).toBe('user-1');
      expect(agg.expiration).toEqual(snapshot.expiration);
      expect(agg.quantityUpdateMonth).toBe(3);
      expect(agg.description).toBe('Desc');
      expect(agg.name).toBe('Nombre');
      expect(agg.active).toBe(true);
      expect(agg.isFavorite).toBe(true);
      expect(agg.isOldMode).toBe(true);
      expect(agg.typeQr).toBe('wifi');
    });
  });

  describe('cargarExistente', () => {
    it('debe restaurar el estado completo desde un snapshot', () => {
      const agg = QrAggregate.cargarExistente(snapshot);

      expect(agg.toSnapshot()).toEqual(snapshot);
    });
  });

  describe('actualizar', () => {
    it('debe retornar una nueva instancia con los campos actualizados', () => {
      const agg = QrAggregate.cargarExistente(snapshot);
      const updated = agg.actualizar({ name: 'Nuevo nombre' });

      expect(updated).not.toBe(agg);
      expect(updated.name).toBe('Nuevo nombre');
      expect(updated.id).toBe(snapshot.id);
      expect(updated.updatedAt).toBeInstanceOf(Date);
    });

    it('debe conservar los campos no incluidos en la actualización', () => {
      const updated = QrAggregate.cargarExistente(snapshot).actualizar({
        name: 'Nuevo nombre',
      });

      expect(updated.userId).toBe(snapshot.userId);
      expect(updated.typeQr).toBe(snapshot.typeQr);
      expect(updated.active).toBe(snapshot.active);
      expect(updated.data).toEqual(snapshot.data);
      expect(updated.createdAt).toEqual(snapshot.createdAt);
    });

    it('debe permitir actualizar a false explícito', () => {
      const agg = QrAggregate.cargarExistente(snapshot);
      const updated = agg.actualizar({ active: false });

      expect(updated.active).toBe(false);
    });
  });

  describe('activar / desactivar / marcarFavorito', () => {
    it('debe activar el QR', () => {
      const agg = QrAggregate.crear({
        idQr: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'user-1',
        typeQr: 'dynamic',
        data: { typeQr: 'dynamic', url: 'https://example.com' },
      });

      const activado = agg.activar();

      expect(activado.active).toBe(true);
    });

    it('debe desactivar el QR', () => {
      const activado = QrAggregate.cargarExistente(snapshot).desactivar();

      expect(activado.active).toBe(false);
    });

    it('debe marcar el QR como favorito', () => {
      const favorito = QrAggregate.cargarExistente(snapshot).marcarFavorito();

      expect(favorito.isFavorite).toBe(true);
    });

    it('debe retornar nuevas instancias (inmutabilidad)', () => {
      const agg = QrAggregate.cargarExistente(snapshot);

      expect(agg.activar()).not.toBe(agg);
      expect(agg.desactivar()).not.toBe(agg);
      expect(agg.marcarFavorito()).not.toBe(agg);
      expect(agg.active).toBe(snapshot.active);
      expect(agg.isFavorite).toBe(snapshot.isFavorite);
    });
  });

  describe('toSnapshot / toEntity', () => {
    it('debe serializar el estado completo del agregado', () => {
      const agg = QrAggregate.cargarExistente(snapshot);

      expect(agg.toSnapshot()).toEqual(snapshot);
    });

    it('toEntity debe devolver el mismo snapshot', () => {
      const agg = QrAggregate.cargarExistente(snapshot);

      expect(agg.toEntity()).toEqual(agg.toSnapshot());
    });
  });

  describe('getters', () => {
    it('debe exponer todos los campos del agregado', () => {
      const agg = QrAggregate.cargarExistente(snapshot);

      expect(agg.id).toBe(snapshot.id);
      expect(agg.idQr).toBe(snapshot.idQr);
      expect(agg.userId).toBe(snapshot.userId);
      expect(agg.expiration).toEqual(snapshot.expiration);
      expect(agg.quantityUpdateMonth).toBe(snapshot.quantityUpdateMonth);
      expect(agg.description).toBe(snapshot.description);
      expect(agg.data).toEqual(snapshot.data);
      expect(agg.name).toBe(snapshot.name);
      expect(agg.active).toBe(snapshot.active);
      expect(agg.isFavorite).toBe(snapshot.isFavorite);
      expect(agg.isOldMode).toBe(snapshot.isOldMode);
      expect(agg.typeQr).toBe(snapshot.typeQr);
      expect(agg.createdAt).toEqual(snapshot.createdAt);
      expect(agg.updatedAt).toEqual(snapshot.updatedAt);
    });
  });
});