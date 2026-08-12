import { ForbiddenException } from '@nestjs/common';
import { assertOwnerOrAdmin } from './ownership.utils';

/**
 * SPEC-009 — Patrón estándar owner OR admin (sección 4, CA-01 base).
 */
describe('assertOwnerOrAdmin (SPEC-009)', () => {
  const ownerActor = { id: 'user-A', role: 'user' };
  const adminActor = { id: 'user-B', role: 'admin' };
  const otherUserActor = { id: 'user-C', role: 'user' };

  it('no lanza cuando el actor es el dueño (user)', () => {
    expect(() => assertOwnerOrAdmin('user-A', ownerActor)).not.toThrow();
  });

  it('no lanza cuando el actor es admin (aunque no sea el dueño)', () => {
    expect(() => assertOwnerOrAdmin('user-A', adminActor)).not.toThrow();
  });

  it('lanza ForbiddenException cuando el actor no es dueño ni admin', () => {
    expect(() => assertOwnerOrAdmin('user-A', otherUserActor)).toThrow(ForbiddenException);
  });

  it('usa el mensaje por defecto', () => {
    try {
      assertOwnerOrAdmin('user-A', otherUserActor);
      fail('Debió lanzar ForbiddenException');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).message).toBe('No tiene permiso sobre este recurso.');
    }
  });

  it('usa el mensaje custom cuando se pasa', () => {
    try {
      assertOwnerOrAdmin('user-A', otherUserActor, 'No puedes tocar este QR');
      fail('Debió lanzar ForbiddenException');
    } catch (error) {
      expect((error as ForbiddenException).message).toBe('No puedes tocar este QR');
    }
  });

  it('devuelve undefined cuando pasa (permite uso como guard)', () => {
    expect(assertOwnerOrAdmin('user-A', ownerActor)).toBeUndefined();
    expect(assertOwnerOrAdmin('user-A', adminActor)).toBeUndefined();
  });
});
