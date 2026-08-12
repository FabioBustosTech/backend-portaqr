/**
 * Tests de los DTOs de búsqueda con @MaxLength(100) (SPEC-008 H3 — R2 ReDoS,
 * límite de longitud del término). Verifica que el límite se aplica en
 * PaginationDto y QueryReservedTagsDto.
 */
import { validate } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { QueryReservedTagsDto } from 'src/modules/pet-tag/application/dto/query-reserved-tags.dto';

describe('DTOs de búsqueda — @MaxLength(100) (SPEC-008 H3 — R2)', () => {
  describe('PaginationDto', () => {
    it('acepta search de hasta 100 caracteres', async () => {
      const dto = new PaginationDto();
      dto.search = 'a'.repeat(100);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rechaza search de más de 100 caracteres (anti-queries gigantes)', async () => {
      const dto = new PaginationDto();
      dto.search = '(a+)+$'.repeat(30); // 150 chars, payload ReDoS gigante
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('search');
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });
  });

  describe('QueryReservedTagsDto', () => {
    it('acepta search y storeName de hasta 100 caracteres', async () => {
      const dto = new QueryReservedTagsDto();
      dto.search = 'a'.repeat(100);
      dto.storeName = 'b'.repeat(100);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rechaza search de más de 100 caracteres', async () => {
      const dto = new QueryReservedTagsDto();
      dto.search = '.*'.repeat(60); // 120 chars
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('search');
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });

    it('rechaza storeName de más de 100 caracteres', async () => {
      const dto = new QueryReservedTagsDto();
      dto.storeName = 'x'.repeat(101);
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('storeName');
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });

    it('mantiene las validaciones previas (page/limit numéricos)', async () => {
      const dto = new QueryReservedTagsDto();
      dto.page = 0;
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'page')).toBe(true);
    });
  });
});
