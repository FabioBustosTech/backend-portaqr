export interface User {
  id: string;
  email: string;
  userName: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  role: 'user' | 'admin';  // Puedes ajustar los roles según sea necesario
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}