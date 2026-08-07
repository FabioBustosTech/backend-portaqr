import { Injectable, Inject } from '@nestjs/common';
import type { ICanCreateQrActivate, ICanActivateQr } from '../../domain/ports/queries/qr-activate.port';
import { QrActivateEntity } from '../../domain/entities/qr-activate.entity';
import { CreateQrActivateDto } from '../dto/create-qr-activate.dto';
import type { QrActivate } from '../../domain/entities/qr-activate.entity';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { QR_ACTIVATE_CREATE_PORT, QR_ACTIVATE_QR_PORT } from '../../domain/constants/qr-activate.tokens';
import { MethodActivation } from '../../domain/entities/qr-activate.entity';

@Injectable()
export class CreateQrActivateUseCase {
  constructor(
    @Inject(QR_ACTIVATE_CREATE_PORT)
    private readonly creator: ICanCreateQrActivate,
    @Inject(QR_ACTIVATE_QR_PORT)
    private readonly qrActivator: ICanActivateQr,
    private readonly traceService: TraceService,
  ) {}

  async execute(dto: CreateQrActivateDto, tracking: TrackingContext): Promise<QrActivate> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'CreateQrActivateUseCase', {
      methodActivation: dto.methodActivation,
    });

    const activation = new QrActivateEntity({
      methodActivation: dto.methodActivation,
      activationDate: dto.activationDate,
      state: dto.state,
      TransferDate: dto.TransferDate,
      descriptionAdministrator: dto.descriptionAdministrator,
      adminId: dto.adminId,
      WebpayTransaction: dto.WebpayTransaction,
      price: dto.price,
      userId: dto.userId,
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
  async executeAdmin(dto: CreateQrActivateDto, tracking: TrackingContext): Promise<QrActivate> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'CreateQrActivateUseCase - admin', {
      methodActivation: dto.methodActivation,
    });

    const created = await this.execute(dto, tracking);

    dto.qrList.forEach((qr) => {
      this.qrActivator.updateQr(
        qr.qrCode,
        { active: true, expiration: qr.expirationDate },
        tracking,
      );
    });

    return created;
  }
}
