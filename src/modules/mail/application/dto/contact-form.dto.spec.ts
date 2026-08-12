/**
 * Tests de ContactFormDto (SPEC-008 Capa 1 — R1 XSS): los campos de texto se
 * limpian de HTML en la transformación (punto de entrada), para que el
 * contenido se guarde/envíe como texto plano sin formato.
 */
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ContactFormDto } from './contact-form.dto';

const TRANSFORM_OPTIONS = { enableImplicitConversion: false };

describe('ContactFormDto — limpieza de HTML en entrada (SPEC-008 H1, CA-01)', () => {
  it('limpia tags HTML de nombre, asunto y mensaje al transformar', () => {
    const dto = plainToInstance(
      ContactFormDto,
      {
        nombre: '<b>Ana</b>',
        email: 'ana@ejemplo.com',
        asunto: '<script>consulta</script>',
        mensaje: '</p><img src=x onerror=alert(1)>',
      },
      TRANSFORM_OPTIONS,
    );

    expect(dto.nombre).toBe('Ana');
    expect(dto.asunto).toBe('consulta');
    // El payload clásico son tags sin contenido interno → desaparece completo
    expect(dto.mensaje).toBe('');
    // Sin HTML ejecutable en ningún campo
    expect(dto.nombre + dto.asunto + dto.mensaje).not.toContain('<');
  });

  it('conserva texto con formato simple como texto plano (p.ej. mensaje con <b>)', () => {
    const dto = plainToInstance(
      ContactFormDto,
      {
        nombre: 'Ana',
        email: 'ana@ejemplo.com',
        asunto: 'Hola',
        mensaje: '<b>Quiero</b> los precios',
      },
      TRANSFORM_OPTIONS,
    );

    expect(dto.mensaje).toBe('Quiero los precios');
  });

  it('preserva el email sin cambios (validado con IsEmail)', () => {
    const dto = plainToInstance(
      ContactFormDto,
      { nombre: 'Ana', email: 'ana@ejemplo.com', asunto: 'a', mensaje: 'm' },
      TRANSFORM_OPTIONS,
    );
    expect(dto.email).toBe('ana@ejemplo.com');
  });

  it('no altera texto plano legítimo', () => {
    const dto = plainToInstance(
      ContactFormDto,
      {
        nombre: 'Ana Gómez',
        email: 'ana@ejemplo.com',
        asunto: 'Consulta general',
        mensaje: 'Quisiera saber los precios 🙂',
      },
      TRANSFORM_OPTIONS,
    );

    expect(dto.nombre).toBe('Ana Gómez');
    expect(dto.asunto).toBe('Consulta general');
    expect(dto.mensaje).toBe('Quisiera saber los precios 🙂');
  });

  it('sigue validando con class-validator tras la limpieza (regresión)', async () => {
    const dto = plainToInstance(
      ContactFormDto,
      {
        nombre: '<b>Ana</b>',
        email: 'ana@ejemplo.com',
        asunto: 'Hola',
        mensaje: '<p>Mensaje</p>',
      },
      TRANSFORM_OPTIONS,
    );

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rechaza email inválido tras la limpieza (regresión)', async () => {
    const dto = plainToInstance(
      ContactFormDto,
      { nombre: 'Ana', email: 'no-es-email', asunto: 'Hola', mensaje: 'Mensaje' },
      TRANSFORM_OPTIONS,
    );

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });
});
