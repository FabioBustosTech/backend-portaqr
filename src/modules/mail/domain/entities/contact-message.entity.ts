/** Entidad de dominio pura de un mensaje de contacto */

export interface ContactMessage {
  nombre: string;
  email: string;
  asunto: string;
  mensaje: string;
}

export class ContactMessageEntity implements ContactMessage {
  nombre: string;
  email: string;
  asunto: string;
  mensaje: string;

  constructor(data: Partial<ContactMessage>) {
    this.nombre = data.nombre || '';
    this.email = data.email || '';
    this.asunto = data.asunto || '';
    this.mensaje = data.mensaje || '';
  }
}
