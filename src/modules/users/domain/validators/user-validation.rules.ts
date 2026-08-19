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

    // SPEC-020 RF-2: userName/nombre/apellidos NO se exigen en la creación —
    // el userName se genera automáticamente (RF-3) y el perfil se captura en el onboarding.
    if (data.userName !== undefined && data.userName !== null && !data.userName.trim()) {
      errors.push('El nombre de usuario no puede estar vacío');
    }

    if (!data.password) {
      errors.push('La contraseña es requerida');
    } else if (data.password.length < 6) {
      errors.push('La contraseña debe tener al menos 6 caracteres');
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
