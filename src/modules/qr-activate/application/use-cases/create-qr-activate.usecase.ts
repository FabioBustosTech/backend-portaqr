import { Injectable, Inject, ForbiddenException, BadRequestException } from '@nestjs/common';
import type { ICanCreateQrActivate, ICanActivateQr } from '../../domain/ports/queries/qr-activate.port';
import { QrActivateEntity, ActivationState, WebpayState } from '../../domain/entities/qr-activate.entity';
import { CreateQrActivateDto } from '../dto/create-qr-activate.dto';
import type { QrActivate } from '../../domain/entities/qr-activate.entity';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { QR_ACTIVATE_CREATE_PORT, QR_ACTIVATE_QR_PORT } from '../../domain/constants/qr-activate.tokens';
import { GetPlanUseCase } from '../../../plan/application/use-cases/get-plan.usecase';
import { GetQrUseCase } from '../../../qr/application/use-cases/get-qr.usecase';
import { QrActivatedNotificationService } from '../services/qr-activated-notification.service';

export interface QrActivateActor {
  id: string;
  role: string;
}

/** SPEC-009 B12: IVA aplicado al total (el TotalTax del snapshot). */
const TAX_RATE = 0.19;

@Injectable()
export class CreateQrActivateUseCase {
  constructor(
    @Inject(QR_ACTIVATE_CREATE_PORT)
    private readonly creator: ICanCreateQrActivate,
    @Inject(QR_ACTIVATE_QR_PORT)
    private readonly qrActivator: ICanActivateQr,
    private readonly getPlanUseCase: GetPlanUseCase,
    private readonly getQrUseCase: GetQrUseCase,
    private readonly notificationService: QrActivatedNotificationService, // SPEC-019 RF-6
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

    // SPEC-009 B12: el precio se calcula desde el PLAN (fuente de verdad) y se congela
    // como SNAPSHOT — el cliente indica QUÉ plan, no CUÁNTO cuesta.
    const qrList: Array<{
      qrCode: string;
      price: number;
      plan: string;
      expirationDate: Date;
      duration: string;
    }> = [];
    let totalPrice = 0;

    for (const item of dto.qrList) {
      // 1. Plan → precio (snapshot)
      const plan = await this.getPlanUseCase.execute(item.planId, tracking);
      if (!plan) {
        throw new BadRequestException(`El plan ${item.planId} no existe`);
      }
      // 2. QR debe existir y pertenecer al dueño de la activación
      const qr = await this.getQrUseCase.execute(item.qrCode, tracking); // 404 si no existe
      if (qr.userId !== targetUserId) {
        throw new ForbiddenException(
          `El QR ${item.qrCode} no pertenece al usuario de la activación`,
        );
      }
      qrList.push({
        qrCode: item.qrCode,
        price: plan.price,
        plan: plan.id,
        expirationDate: item.expirationDate,
        duration: item.duration,
      });
      totalPrice += plan.price;
    }

    const price = {
      TotalPrice: totalPrice,
      TotalTax: Math.round(totalPrice * TAX_RATE),
      TotalDiscount: 0,
    };

    const activation = new QrActivateEntity({
      methodActivation: dto.methodActivation,
      state,
      descriptionAdministrator: dto.descriptionAdministrator,
      adminId: dto.adminId,
      WebpayTransaction: webpayTransaction,
      price,
      userId: targetUserId,
      description: dto.description,
      qrList,
      documentType: dto.documentType,
      invoiceData: dto.invoiceData,
      sendDocument: dto.sendDocument,
      createdAt: new Date(),
      // SPEC-019 RF-8: la activación admin nace activa → activationDate desde el inicio
      // (en Webpay se asigna en el update a PAYED — update-webpay-qr-activate.usecase)
      activationDate: state === ActivationState.ADMIN ? new Date() : undefined,
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

    // SPEC-019 RF-6: correo de activación al CLIENTE (activation.userId = dto.userId, RN-3/ADR-019.4),
    // no al admin. Best-effort (ADR-019.2) con try/catch defensivo — la respuesta al admin no cambia.
    try {
      await this.notificationService.notify(created, tracking);
    } catch (error) {
      this.traceService.error(
        tracking,
        TraceLayer.USE_CASE,
        'CreateQrActivateUseCase - notify falló (best-effort)',
        error,
      );
    }

    return created;
  }
}
