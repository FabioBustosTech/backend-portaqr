import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import type { ICanCreateQrActivate, ICanActivateQr } from '../../domain/ports/queries/qr-activate.port';
import { QrActivateEntity, ActivationState, WebpayState } from '../../domain/entities/qr-activate.entity';
import { CreateQrActivateDto } from '../dto/create-qr-activate.dto';
import type { QrActivate } from '../../domain/entities/qr-activate.entity';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { QR_ACTIVATE_CREATE_PORT, QR_ACTIVATE_QR_PORT } from '../../domain/constants/qr-activate.tokens';

export interface QrActivateActor {
  id: string;
  role: string;
}

@Injectable()
export class CreateQrActivateUseCase {
  constructor(
    @Inject(QR_ACTIVATE_CREATE_PORT)
    private readonly creator: ICanCreateQrActivate,
    @Inject(QR_ACTIVATE_QR_PORT)
    private readonly qrActivator: ICanActivateQr,
    private readonly traceService: TraceService,
  ) {}

  async execute(
    dto: CreateQrActivateDto,
    actor: QrActivateActor,
    tracking: TrackingContext,
  ): Promise<QrActivate> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'CreateQrActivateUseCase', {
      methodActivation: dto.methodActivation,
    });

    // SPEC-009 A3: userId según rol (decisión 2026-08-12 — el admin activa POR un cliente)
    // - usuario user: userId SIEMPRE del token (solo activa para sí mismo)
    // - admin: se acepta el userId del body (puede ser un cliente); si no viene, usa el suyo
    let targetUserId = actor.id;
    if (actor.role === 'admin') {
      targetUserId = dto.userId || actor.id;
    } else if (dto.userId && dto.userId !== actor.id) {
      throw new ForbiddenException('Solo puedes crear activaciones para tu propio usuario.');
    }

    // SPEC-009 A3: el state lo fija el usecase — el cliente nunca decide estados transaccionales
    // (ActivationState.ADMIN = 'ADMINCREATED' en la entidad — qr-activate.entity.ts)
    const state =
      dto.methodActivation === 'ADMIN' && actor.role === 'admin'
        ? ActivationState.ADMIN
        : ActivationState.PENDING;

    // SPEC-009 A3: WebpayTransaction se arma internamente desde el token simple (el commit
    // busca la activación por 'WebpayTransaction.id' — mongo-qr-activate.repository).
    const webpayTransaction = dto.webpayToken
      ? {
          id: dto.webpayToken,
          date: new Date(),
          state: WebpayState.INITIAL,
        }
      : undefined;

    const activation = new QrActivateEntity({
      methodActivation: dto.methodActivation,
      state,
      descriptionAdministrator: dto.descriptionAdministrator,
      adminId: dto.adminId,
      WebpayTransaction: webpayTransaction,
      price: dto.price,
      userId: targetUserId,
      description: dto.description,
      qrList: dto.qrList.map((qr) => ({
        qrCode: qr.qrCode,
        price: qr.price,
        expirationDate: qr.expirationDate,
        duration: qr.duration,
      })),
      documentType: dto.documentType,
      invoiceData: dto.invoiceData,
      sendDocument: dto.sendDocument,
      createdAt: new Date(),
    });

    return this.creator.create(activation, tracking);
  }

  /** Creación admin: además activa los QRs */
  async executeAdmin(
    dto: CreateQrActivateDto,
    actor: QrActivateActor,
    tracking: TrackingContext,
  ): Promise<QrActivate> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'CreateQrActivateUseCase - admin', {
      methodActivation: dto.methodActivation,
    });

    const created = await this.execute(dto, actor, tracking);

    // Activar los QRs de la compra en 1 operación batch atómica (SPEC-007 H2)
    const codes = dto.qrList.map((qr) => qr.qrCode);
    if (codes.length > 0) {
      const { matchedCount, modifiedCount } = await this.qrActivator.activateMany(
        codes,
        dto.qrList[0]?.expirationDate ?? new Date(),
        tracking,
      );

      if (matchedCount < codes.length) {
        this.traceService.warn(
          tracking,
          TraceLayer.USE_CASE,
          'CreateQrActivateUseCase - QRs inexistentes',
          { total: codes.length, matchedCount, modifiedCount },
        );
      }
    }

    return created;
  }
}
