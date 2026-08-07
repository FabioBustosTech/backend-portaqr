/** Entidades de dominio puras para Estadísticas */

export interface ScanStatistics {
  total: number;
  monthly: number;
  daily: number;
}

export interface QrStatistics {
  total: number;
  active: number;
}

export interface UserStatistics {
  scans: ScanStatistics;
  qrs: QrStatistics;
}

export interface SystemUserStatistics {
  total: number;
  active: number;
}

export interface SystemStatistics {
  scans: ScanStatistics;
  qrs: QrStatistics;
  users: SystemUserStatistics;
}
