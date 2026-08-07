import { PartialType } from '@nestjs/swagger';
import { CreateQrFreeGenerationDto } from './create-qr-free-generation.dto';

export class UpdateQrFreeGenerationDto extends PartialType(CreateQrFreeGenerationDto) {}
