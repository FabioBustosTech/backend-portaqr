import { Injectable, Inject, Logger } from '@nestjs/common';
import type { ICanCreateQr } from '../../domain/ports/queries/qr.port';
import { QrAggregate } from '../../domain/aggregates/qr.aggregate';
import { CreateQrDto } from '../dto/create-qr.dto';
import type { Qr } from '../../domain/entities/qr.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { QR_CREATE_PORT } from '../../domain/constants/qr.tokens';

@Injectable()
export class CreateQrUseCase {
  private readonly logger = new Logger(CreateQrUseCase.name);

  constructor(
    @Inject(QR_CREATE_PORT)
    private readonly creator: ICanCreateQr,
    private readonly traceService: TraceService,
  ) {}

  async execute(dto: CreateQrDto, tracking: TrackingContext): Promise<Qr> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'CreateQrUseCase - input', {
      idQr: dto.idQr,
      userId: dto.userId,
      typeQr: dto.typeQr,
    });

    const aggregate = QrAggregate.crear({
      idQr: dto.idQr,
      userId: dto.userId,
      expiration: dto.expiration,
      quantityUpdateMonth: dto.quantityUpdateMonth,
      description: dto.description,
      data: dto.data as Qr['data'],
      name: dto.name,
      active: dto.active,
      isFavorite: dto.isFavorite,
      isOldMode: dto.isOldMode,
      typeQr: dto.typeQr,
    });

    const resultado = await this.creator.create(aggregate.toEntity(), tracking);
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'CreateQrUseCase - created', {
      id: resultado.id,
      idQr: resultado.idQr,
    });
    return resultado;
  }
}
