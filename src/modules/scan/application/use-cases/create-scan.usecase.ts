import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ICanCreateScan } from '../../domain/ports/queries/scan.port';
import { ScanEntity } from '../../domain/entities/scan.entity';
import { CreateScanDto } from '../dto/create-scan.dto';
import type { Scan } from '../../domain/entities/scan.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { SCAN_CREATE_PORT } from '../../domain/constants/scan.tokens';
import { GetQrUseCase } from '../../../qr/application/use-cases/get-qr.usecase';

@Injectable()
export class CreateScanUseCase {
  constructor(
    @Inject(SCAN_CREATE_PORT)
    private readonly creator: ICanCreateScan,
    private readonly getQrUseCase: GetQrUseCase,
    private readonly traceService: TraceService,
  ) {}

  async execute(dto: CreateScanDto, tracking: TrackingContext): Promise<Scan> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'CreateScanUseCase - input', {
      idQr: dto.idQr,
    });

    // SPEC-009 A9: el QR debe existir → 404 y NO se crea documento (anti-flood/anti-inflado)
    const qr = await this.getQrUseCase.execute(dto.idQr, tracking);
    if (!qr) {
      this.traceService.warn(tracking, TraceLayer.USE_CASE, 'CreateScanUseCase - QR inexistente', {
        idQr: dto.idQr,
      });
      throw new NotFoundException('El código QR no existe');
    }

    // SPEC-009 A9: el dueño real se toma del QR — el userId del body se IGNORA
    // (el cliente no decide a quién se atribuye el escaneo → no se inflan analytics ajenos)
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
      userId: qr.userId,
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
