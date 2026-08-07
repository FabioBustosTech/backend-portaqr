import { Injectable } from '@nestjs/common';
import type { User } from '../entities/user.entity';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

@Injectable()
export class UserValidationRules {
  validateForCreate(data: Partial<User>): ValidationResult {
    const errors: string[] = [];

    if (!data.email || !data.email.trim()) {
      errors.push('El email es requerido');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('El formato del email es inválido');
    }

    if (!data.userName || !data.userName.trim()) {
      errors.push('El nombre de usuario es requerido');
    }

    if (!data.password) {
      errors.push('La contraseña es requerida');
    } else if (data.password.length < 6) {
      errors.push('La contraseña debe tener al menos 6 caracteres');
    }

    if (!data.firstName || !data.firstName.trim()) {
      errors.push('El nombre es requerido');
    }
    if (!data.paternalLastName || !data.paternalLastName.trim()) {
      errors.push('El apellido paterno es requerido');
    }
    if (!data.maternalLastName || !data.maternalLastName.trim()) {
      errors.push('El apellido materno es requerido');
    }

    return { valid: errors.length === 0, errors };
  }

  normalize(data: {
    email?: string;
    userName?: string;
    firstName?: string;
    paternalLastName?: string;
    maternalLastName?: string;
  }): {
    email?: string;
    userName?: string;
    firstName?: string;
    paternalLastName?: string;
    maternalLastName?: string;
  } {
    return {
      email: data.email?.trim().toLowerCase(),
      userName: data.userName?.trim(),
      firstName: data.firstName?.trim(),
      paternalLastName: data.paternalLastName?.trim(),
      maternalLastName: data.maternalLastName?.trim(),
    };
  }
}
