/**
 * Tests de integración del ValidationPipe global (SPEC-008 H2 — R3).
 * Verifica exactamente la config de producción (createAppValidationPipe):
 *   CA-03 → POST con campo extra devuelve 400 (forbidNonWhitelisted) y
 *           sin forbid, el campo no se persiste (whitelist)
 *   CA-04 → @Query() tipado: page=2&limit=50 llega como número (transform);
 *           page=abc → 400; bounds respetados
 *   CA-10 → inyección NoSQL clásica ({"$ne":""}) en body → 400
 */
import { Controller, Get, Post, Body, Query, Module } from '@nestjs/common';
import { IsString, IsInt, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as request from 'supertest';
import { createAppValidationPipe } from './common/config/validation-pipe.config';

// --- DTOs de prueba (análogos a los reales del proyecto) ---

class CreateThingDto {
  @IsString()
  name!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  quantity?: number;
}

class SearchThingDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

// --- Controlador de prueba ---

@Controller('echo')
class EchoController {
  @Post()
  create(@Body() body: CreateThingDto): { received: CreateThingDto } {
    return { received: body };
  }

  @Get()
  search(@Query() query: SearchThingDto): { received: SearchThingDto } {
    return { received: query };
  }
}

@Module({ controllers: [EchoController] })
class EchoModule {}

describe('ValidationPipe global (SPEC-008 H2 — R3, CA-03/CA-04/CA-10)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [EchoModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.useGlobalPipes(createAppValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('CA-03 — mass-assignment en body', () => {
    it('rechaza 400 un campo no declarado en el DTO (forbidNonWhitelisted)', async () => {
      const res = await request(app.getHttpServer())
        .post('/echo')
        .send({ name: 'ok', hack: true })
        .expect(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('hack')]),
      );
    });

    it('rechaza 400 la inyección NoSQL clásica {"$ne":""} en body (CA-10)', async () => {
      const res = await request(app.getHttpServer())
        .post('/echo')
        .send({ name: { $ne: '' } })
        .expect(400);
      // name falla IsString y $ne es campo no whitelisted
      expect(res.body.statusCode).toBe(400);
    });

    it('rechaza 400 body con operador $where (defensa en profundidad)', async () => {
      const res = await request(app.getHttpServer())
        .post('/echo')
        .send({ name: 'x', $where: 'sleep(1000)' })
        .expect(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('$where')]),
      );
    });

    it('acepta 201 un body válido con el campo declarado', async () => {
      const res = await request(app.getHttpServer())
        .post('/echo')
        .send({ name: 'válido', quantity: 3 })
        .expect(201);
      expect(res.body.received).toEqual({ name: 'válido', quantity: 3 });
    });

    it('transforma quantity string a número (transform: true)', async () => {
      const res = await request(app.getHttpServer())
        .post('/echo')
        .send({ name: 'x', quantity: '5' })
        .expect(201);
      expect(res.body.received.quantity).toBe(5);
      expect(typeof res.body.received.quantity).toBe('number');
    });
  });

  describe('CA-04 — query params tipados', () => {
    it('transforma page/limit string a número (skip calculable en repos)', async () => {
      const res = await request(app.getHttpServer())
        .get('/echo?page=2&limit=50')
        .expect(200);
      expect(res.body.received.page).toBe(2);
      expect(res.body.received.limit).toBe(50);
      expect(typeof res.body.received.page).toBe('number');
      expect(typeof res.body.received.limit).toBe('number');
    });

    it('rechaza 400 page=abc (no numérico, sin NaN silencioso)', async () => {
      const res = await request(app.getHttpServer())
        .get('/echo?page=abc')
        .expect(400);
      expect(res.body.statusCode).toBe(400);
    });

    it('rechaza 400 page=0 y limit=0 (bounds @Min(1))', async () => {
      await request(app.getHttpServer()).get('/echo?page=0').expect(400);
      await request(app.getHttpServer()).get('/echo?limit=0').expect(400);
    });

    it('rechaza 400 limit=999 (> @Max(50))', async () => {
      await request(app.getHttpServer()).get('/echo?limit=999').expect(400);
    });

    it('rechaza 400 un query param no declarado (forbidNonWhitelisted en query)', async () => {
      const res = await request(app.getHttpServer())
        .get('/echo?search=x&sort=ASC')
        .expect(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('sort')]),
      );
    });

    it('acepta 200 sin params (todos opcionales)', async () => {
      const res = await request(app.getHttpServer()).get('/echo').expect(200);
      expect(res.body.received).toEqual({});
    });
  });
});
