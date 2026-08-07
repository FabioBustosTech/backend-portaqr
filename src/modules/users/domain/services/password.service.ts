import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordService {
  private readonly SALT_ROUNDS = 10;

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  async comparePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  isPasswordStrong(password: string): { valido: boolean; message: string } {
    if (password.length < 8) {
      return {
        valido: false,
        message: 'La contraseña debe tener al menos 8 caracteres',
      };
    }
    return { valido: true, message: '' };
  }
}
