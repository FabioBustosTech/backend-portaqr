/**
 * DTO de query para GET /qr (vista admin global, SPEC-015).
 * Extiende PaginationDto (page/limit/search validados, patrón SPEC-008 H5) y
 * añade los filtros admin: active (estado), type (tipo de QR) y userId (dueño).
 */
import { IsOptional, IsIn, IsEnum, IsMongoId } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { QrType } from './create-qr.dto';

export class AdminQrsQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filtrar por estado del QR',
    enum: ['all', 'active', 'inactive', 'deactivated'],
    default: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'active', 'inactive', 'deactivated'], {
    message: 'active debe ser all, active, inactive o deactivated',
  })
  active?: 'all' | 'active' | 'inactive' | 'deactivated' = 'all';

  @ApiPropertyOptional({
    description: 'Filtrar por tipo de QR',
    enum: QrType,
    example: 'whatsapp',
  })
  @IsOptional()
  @IsEnum(QrType, { message: 'type debe ser un tipo de QR válido' })
  type?: QrType;

  @ApiPropertyOptional({
    description: 'Filtrar por usuario dueño (ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsMongoId({ message: 'userId debe ser un ObjectId válido' })
  userId?: string;
}
