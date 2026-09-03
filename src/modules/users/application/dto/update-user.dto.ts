import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsBoolean, IsIn } from 'class-validator';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['email', 'password', 'isEmailVerified'] as const),
) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // SPEC-030 RF-8: origen transitorio del intent (onboarding vs settings).
  // No se persiste (UpdateUserUseCase lo excluye); forbidNonWhitelisted lo
  // exige declarado para no rechazar el PATCH con 400.
  @IsOptional()
  @IsIn(['onboarding', 'settings'])
  newsletterSource?: 'onboarding' | 'settings';
}
