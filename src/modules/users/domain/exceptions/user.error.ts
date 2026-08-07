export class UserNotFoundError extends Error {
  constructor(message = 'Usuario no encontrado') {
    super(message);
    this.name = 'UserNotFoundError';
  }
}

export class UserAlreadyExistsError extends Error {
  constructor(message = 'El usuario ya existe') {
    super(message);
    this.name = 'UserAlreadyExistsError';
  }
}

export class InvalidVerificationCodeError extends Error {
  constructor(message = 'Código de verificación inválido') {
    super(message);
    this.name = 'InvalidVerificationCodeError';
  }
}

export class InvalidResetCodeError extends Error {
  constructor(message = 'Código de recuperación inválido') {
    super(message);
    this.name = 'InvalidResetCodeError';
  }
}
