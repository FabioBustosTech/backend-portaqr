import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['email', 'password', 'isEmailVerified'] as const),
) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
