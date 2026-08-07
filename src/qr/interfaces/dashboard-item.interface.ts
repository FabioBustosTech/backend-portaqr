// MEJORA: Definimos una interfaz unificada para los ítems del dashboard.
// Este es el "contrato" que le prometemos a TypeScript.

export interface DashboardItem {
  _id: string;
  type: 'standard' | 'pet-tag';
  name: string;
  isFavorite: boolean;
  updatedAt: Date;
  qrId: string; // El UUID público para construir la URL en el frontend
  // Puedes añadir más campos comunes aquí si los necesitas (ej. status)
}
