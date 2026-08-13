import { ForbiddenException } from '@nestjs/common';

/**
 * SPEC-009 — Patrón estándar de autorización (owner OR admin).
 *
 * Permite operar sobre un recurso solo si el actor es su dueño (`actor.id === ownerId`)
 * o es `admin`. En cualquier otro caso lanza `ForbiddenException` (403).
 *
 * Regla de uso (sección 4 de la SPEC-009):
 * - Escrituras (PATCH users, PATCH qr-activate, commit webpay): la regla vive en el
 *   usecase (recibe `actor`) y el controller la aplica primero como fail-fast.
 * - Lecturas (GET users/:id, webpay status/transaction, scan stats): check en el
 *   controller con este helper.
 *
 * @param ownerId Id del dueño del recurso (p. ej. `user.id`, `tx.sessionId`, `qr.userId`).
 * @param actor Usuario autenticado extraído del token JWT (`req.user`).
 * @param message Mensaje opcional del 403.
 * @throws ForbiddenException si el actor no es dueño ni admin.
 */
export function assertOwnerOrAdmin(
  ownerId: string,
  actor: { id: string; role: string },
  message = 'No tiene permiso sobre este recurso.',
): void {
  const isOwner = actor.id === ownerId;
  const isAdmin = actor.role === 'admin';
  if (!isOwner && !isAdmin) {
    throw new ForbiddenException(message);
  }
}
