/**
 * DTO de query para GET /qr/user/favorites (SPEC-008 H5 — R5/R6).
 * Extiende PaginationDto (page/limit/search validados y tipados) y añade
 * el filtro opcional userId (solo para admins).
 */
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class FavoriteQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filtrar por ID de usuario (solo admin)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString()
  userId?: string;
}
