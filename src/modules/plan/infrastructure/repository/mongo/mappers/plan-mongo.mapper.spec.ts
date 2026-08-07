import { PlanMongoMapper } from './plan-mongo.mapper';
import { DurationType } from '../../../../domain/entities/plan.entity';
import type { Plan } from '../../../../domain/entities/plan.entity';

describe('PlanMongoMapper', () => {
  describe('toEntity', () => {
    it('debe mapear un documento con _id a entidad', () => {
      const doc = {
        _id: { toString: () => 'plan-1' },
        name: 'Plan Básico',
        description: 'Plan básico',
        status: 'ACTIVO',
        endDate: new Date('2025-01-01'),
        updatedDate: new Date('2024-01-02'),
        createdDate: new Date('2024-01-01'),
        details: [{ detail: 'QR ilimitado' }],
        price: 5000,
        active: true,
        populier: false,
        free: false,
        detailDuration: { type: DurationType.MONTHS, duration: 1 },
        typeQr: 'STATIC',
      };

      const entity = PlanMongoMapper.toEntity(doc);

      expect(entity).toEqual({
        id: 'plan-1',
        name: 'Plan Básico',
        description: 'Plan básico',
        status: 'ACTIVO',
        endDate: doc.endDate,
        updatedDate: doc.updatedDate,
        createdDate: doc.createdDate,
        details: doc.details,
        price: 5000,
        active: true,
        populier: false,
        free: false,
        detailDuration: doc.detailDuration,
        typeQr: 'STATIC',
        createdAt: doc.createdDate,
        updatedAt: doc.updatedDate,
      });
    });

    it('debe usar id vacío cuando el documento no tiene _id', () => {
      const entity = PlanMongoMapper.toEntity({
        name: 'Plan Free',
        description: 'Gratis',
        status: 'ACTIVO',
        endDate: undefined,
        updatedDate: undefined,
        createdDate: undefined,
        details: [],
        price: 0,
        active: true,
        populier: false,
        free: true,
        detailDuration: { type: DurationType.MONTHS, duration: 1 },
        typeQr: 'STATIC',
      });

      expect(entity.id).toBe('');
      expect(entity.name).toBe('Plan Free');
      expect(entity.createdAt).toBeUndefined();
    });
  });

  describe('toSchemaData', () => {
    it('debe mapear la entidad a datos de schema', () => {
      const plan: Plan = {
        id: 'plan-1',
        name: 'Plan Básico',
        description: 'Plan básico',
        status: 'ACTIVO',
        details: [{ detail: 'QR ilimitado' }],
        price: 5000,
        active: true,
        populier: false,
        free: false,
        detailDuration: { type: DurationType.MONTHS, duration: 1 },
        typeQr: 'STATIC',
      };

      const data = PlanMongoMapper.toSchemaData(plan);

      expect(data).toEqual({
        name: 'Plan Básico',
        description: 'Plan básico',
        status: 'ACTIVO',
        endDate: undefined,
        updatedDate: undefined,
        createdDate: undefined,
        details: plan.details,
        price: 5000,
        active: true,
        populier: false,
        free: false,
        detailDuration: plan.detailDuration,
        typeQr: 'STATIC',
      });
    });

    it('debe mapear datos parciales sin campos opcionales', () => {
      const data = PlanMongoMapper.toSchemaData({ name: 'Plan X' });

      expect(data).toEqual({
        name: 'Plan X',
        description: undefined,
        status: undefined,
        endDate: undefined,
        updatedDate: undefined,
        createdDate: undefined,
        details: undefined,
        price: undefined,
        active: undefined,
        populier: undefined,
        free: undefined,
        detailDuration: undefined,
        typeQr: undefined,
      });
    });
  });
});