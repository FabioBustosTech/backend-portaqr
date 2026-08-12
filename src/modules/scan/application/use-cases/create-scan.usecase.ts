import { Injectable, Inject } from '@nestjs/common';
import type { ICanCreateScan } from '../../domain/ports/queries/scan.port';
import { ScanEntity } from '../../domain/entities/scan.entity';
import { CreateScanDto } from '../dto/create-scan.dto';
import type { Scan } from '../../domain/entities/scan.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { SCAN_CREATE_PORT } from '../../domain/constants/scan.tokens';

@Injectable()
export class CreateScanUseCase {
  constructor(
    @Inject(SCAN_CREATE_PORT)
    private readonly creator: ICanCreateScan,
    private readonly traceService: TraceService,
  ) {}

  async execute(dto: CreateScanDto, tracking: TrackingContext): Promise<Scan> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'CreateScanUseCase - input', {
      idQr: dto.idQr,
      userId: dto.userId,
    });

    const scan = new ScanEntity({
      idQr: dto.idQr,
      scanDate: dto.scanDate,
      location: dto.location,
      device: dto.device,
      origen: dto.origen,
      successful: dto.successful,
      errorMessage: dto.errorMessage,
      userIdScan: dto.userIdScan,
      lastScanId: dto.lastScanId,
      userId: dto.userId,
      ip: dto.ip,
      referer: dto.referer,
    });

    const saved = await this.creator.create(scan, tracking);
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'CreateScanUseCase - created', {
      id: saved.id,
      idQr: saved.idQr,
    });
    return saved;
  }
}
