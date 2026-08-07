import { PartialType } from '@nestjs/swagger';
import { CreateScanDto } from './create-scan.dto';

export class UpdateScanDto extends PartialType(CreateScanDto) {}
