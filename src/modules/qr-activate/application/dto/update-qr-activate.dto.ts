import { IsOptional, IsString } from 'class-validator';

/**
 * SPEC-009 A3: solo campos NO transaccionales. Los estados/pagos se transicionan
 * únicamente desde update-webpay-qr-activate.usecase (commit) o el flujo admin.
 */
export class UpdateQrActivateDto {
  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'La descripción del administrador debe ser una cadena de texto' })
  descriptionAdministrator?: string;
}
