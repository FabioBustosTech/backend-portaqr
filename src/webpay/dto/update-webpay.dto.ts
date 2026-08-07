import { PartialType } from '@nestjs/swagger';
import { CreateWebpayDto } from './create-webpay.dto';

export class UpdateWebpayDto extends PartialType(CreateWebpayDto) {}
