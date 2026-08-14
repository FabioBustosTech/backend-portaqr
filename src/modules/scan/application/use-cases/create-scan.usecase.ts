import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ICanCreateScan } from '../../domain/ports/queries/scan.port';
import { ScanEntity } from '../../domain/entities/scan.entity';
import { CreateScanDto } from '../dto/create-scan.dto';
import type { Scan } from '../../domain/entities/scan.entity';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { SCAN_CREATE_PORT } from '../../domain/constants/scan.tokens';
import { GetQrUseCase } from '../../../qr/application/use-cases/get-qr.usecase';
import type { ICanGetPetTag } from '../../../pet-tag/domain/ports/queries/pet-tag.port';
import { PET_TAG_GET_PORT } from '../../../pet-tag/domain/constants/pet-tag.tokens';

@Injectable()
export class CreateScanUseCase {
  constructor(
    @Inject(SCAN_CREATE_PORT)
    private readonly creator: ICanCreateScan,
    private readonly getQrUseCase: GetQrUseCase,
    @Inject(PET_TAG_GET_PORT)
    private readonly petTagGetter: ICanGetPetTag,
    private readonly traceService: TraceService,
  ) {}

  async execute(dto: CreateScanDto, tracking: TrackingContext): Promise<Scan> {
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'CreateScanUseCase - input', {
      idQr: dto.idQr,
    });

    // SPEC-009 A9: el QR debe existir → 404 y NO se crea documento (anti-flood/anti-inflado).
    // SPEC-016 fix: los PetTags NO tienen QR espejo en `qrs` (viven en `pettagschemas`) —
    // si el idQr no es un QR, se resuelve el dueño desde la placa (fallback).
    let ownerUserId: string | null = null;
    let source = 'qr';
    try {
      const qr = await this.getQrUseCase.execute(dto.idQr, tracking);
      ownerUserId = qr.userId;
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        throw error; // errores no-404 (DB down, etc.) se propagan tal cual
      }
      const petTagOwner = await this.petTagGetter.getOwner(dto.idQr, tracking);
      if (!petTagOwner) {
        this.traceService.warn(tracking, TraceLayer.USE_CASE, 'CreateScanUseCase - QR inexistente', {
          idQr: dto.idQr,
        });
        throw new NotFoundException('El código QR no existe');
      }
      ownerUserId = petTagOwner.userId;
      source = 'pet-tag';
    }

    // SPEC-009 A9: el dueño real se toma del backend (QR o placa) — el userId del body se IGNORA
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
      userId: ownerUserId,
      ip: dto.ip,
      referer: dto.referer,
    });

    const saved = await this.creator.create(scan, tracking);
    this.traceService.log(tracking, TraceLayer.USE_CASE, 'CreateScanUseCase - created', {
      id: saved.id,
      idQr: saved.idQr,
      source,
      userId: ownerUserId,
    });
    return saved;
  }
}
