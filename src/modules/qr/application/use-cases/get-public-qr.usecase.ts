import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import type { ICanGetQr } from '../../domain/ports/queries/qr.port';
import type { Qr } from '../../domain/entities/qr.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { QR_GET_PORT } from '../../domain/constants/qr.tokens';

export interface PublicQrRedirect {
  data: Qr['data'];
  id: string;
  name: string;
  description: string;
}

@Injectable()
export class GetPublicQrUseCase {
  constructor(
    @Inject(QR_GET_PORT)
    private readonly reader: ICanGetQr,
    private readonly traceService: TraceService,
  ) {}

  async execute(id: string, tracking: TrackingContext): Promise<PublicQrRedirect> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'GetPublicQrUseCase - input', { id });

    const qr = await this.reader.getById(id, tracking);
    if (!qr) {
      this.traceService.warn(tracking, TraceLayer.USE_CASE, 'GetPublicQrUseCase - not found', { id });
      throw new HttpException(`QR con ID ${id} no encontrado`, HttpStatus.NOT_FOUND);
    }

    if (!qr.active) {
      this.traceService.warn(tracking, TraceLayer.USE_CASE, 'GetPublicQrUseCase - inactive', { id });
      throw new HttpException('QR inactivo', HttpStatus.NOT_FOUND);
    }

    return {
      data: qr.data,
      name: qr.name || '',
      id: qr.userId,
      description: qr.description || '',
    };
  }
}
