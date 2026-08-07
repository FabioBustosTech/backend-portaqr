import { PartialType } from '@nestjs/swagger';
import { CreateQrActivateDto } from './create-qr-activate.dto';

export class UpdateQrActivateDto extends PartialType(CreateQrActivateDto) {}
