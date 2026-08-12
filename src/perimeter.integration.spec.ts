/**
 * Tests de integración del perímetro (SPEC-008 H4 — R4):
 *   CA-05 → headers helmet (nosniff, CSP) presentes; CORS bloquea orígenes no listados
 *   CA-06 → throttler: >N requests en TTL → 429; @Throttle por-ruta con límite menor
 */
import { Controller, Get, Module, Post } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule, Throttle } from '@nestjs/throttler';
import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as request from 'supertest';
import helmet from 'helmet';
import { HELMET_OPTIONS, parseCorsOrigins } from './common/config/security.config';
import { SENSITIVE_ENDPOINT_THROTTLE } from './common/config/throttle.config';

// --- Controlador de prueba ---

@Controller('probe')
class ProbeController {
  @Get()
  get(): { ok: true } {
    return { ok: true };
  }

  @Post('sensitive')
  @Throttle(SENSITIVE_ENDPOINT_THROTTLE)
  postSensitive(): { ok: true } {
    return { ok: true };
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

describe('Perímetro — helmet + CORS (SPEC-008 H4 — R4, CA-05)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ProbeModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.use(helmet(HELMET_OPTIONS));
    app.enableCors({
      origin: parseCorsOrigins('https://app.portaqr.cl'),
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      allowedHeaders: 'Content-Type,Accept,Authorization',
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('incluye X-Content-Type-Options: nosniff (anti MIME sniffing)', async () => {
    const res = await request(app.getHttpServer()).get('/probe').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('incluye Content-Security-Policy de helmet', async () => {
    const res = await request(app.getHttpServer()).get('/probe').expect(200);
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('incluye X-Frame-Options (anti clickjacking)', async () => {
    const res = await request(app.getHttpServer()).get('/probe').expect(200);
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('permite un origen de la whitelist (ACAO presente)', async () => {
    const res = await request(app.getHttpServer())
      .get('/probe')
      .set('Origin', 'https://app.portaqr.cl')
      .expect(200);
    expect(res.headers['access-control-allow-origin']).toBe(
      'https://app.portaqr.cl',
    );
  });

  it('bloquea un origen no listado (sin ACAO)', async () => {
    const res = await request(app.getHttpServer())
      .get('/probe')
      .set('Origin', 'https://evil.example.com')
      .expect(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('Throttler — rate limiting (SPEC-008 H4 — R4, CA-06)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 1000, limit: 3 }],
        }),
        ProbeModule,
      ],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('permite requests dentro del límite global (3 en 1s)', async () => {
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer()).get('/probe').expect(200);
    }
  });

  it('devuelve 429 al superar el límite global (CA-06)', async () => {
    const res = await request(app.getHttpServer()).get('/probe').expect(429);
    expect(res.body.statusCode).toBe(429);
    expect(res.body.message).toContain('Too Many Requests');
  });

  it('aplica el límite por-ruta @Throttle (5/min en endpoints sensibles)', async () => {
    // Espera 1.1s para que el contador global del endpoint público se resetee
    await new Promise((r) => setTimeout(r, 1100));

    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer()).post('/probe/sensitive').expect(201);
    }
    // La 6ª petición al endpoint sensible excede su límite propio (5/min)
    await request(app.getHttpServer()).post('/probe/sensitive').expect(429);
  });
});
