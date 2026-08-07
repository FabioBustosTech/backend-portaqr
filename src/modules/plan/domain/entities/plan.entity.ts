/** Entidad de dominio pura de un Plan */

export enum DurationType {
  DAYS = 'DAYS',
  WEEKS = 'WEEKS',
  MONTHS = 'MONTHS',
  YEARS = 'YEARS',
}

export interface PlanDetail {
  detail: string;
}

export interface PlanDetailDuration {
  type: DurationType;
  duration: number;
}

export interface Plan {
  id?: string;
  name: string;
  description: string;
  status: string;
  endDate?: Date;
  updatedDate?: Date;
  createdDate?: Date;
  details: PlanDetail[];
  price: number;
  active: boolean;
  populier: boolean;
  free: boolean;
  detailDuration: PlanDetailDuration;
  typeQr: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PlanPagination {
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedPlans {
  data: Plan[];
  pagination: PlanPagination;
}

export class PlanEntity implements Plan {
  id?: string;
  name: string;
  description: string;
  status: string;
  endDate?: Date;
  updatedDate?: Date;
  createdDate?: Date;
  details: PlanDetail[];
  price: number;
  active: boolean;
  populier: boolean;
  free: boolean;
  detailDuration: PlanDetailDuration;
  typeQr: string;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(data: Partial<Plan>) {
    this.id = data.id;
    this.name = data.name || '';
    this.description = data.description || '';
    this.status = data.status || '';
    this.endDate = data.endDate;
    this.updatedDate = data.updatedDate;
    this.createdDate = data.createdDate;
    this.details = data.details || [];
    this.price = data.price || 0;
    this.active = data.active ?? true;
    this.populier = data.populier ?? false;
    this.free = data.free ?? false;
    this.detailDuration = data.detailDuration || {
      type: DurationType.MONTHS,
      duration: 1,
    };
    this.typeQr = data.typeQr || '';
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
