import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NewsletterSyncService } from './newsletter-sync.service';

describe('NewsletterSyncService (SPEC-030 RF-8)', () => {
  let service: NewsletterSyncService;
  let configGet: jest.Mock;
  let fetchSpy: jest.SpyInstance;

  const baseEnv = {
    CMS_BASE_URL: 'https://cms.portaqr.cl',
    CMS_NEWSLETTER_API_KEY: 'secret-key',
    NEWSLETTER_SYNC_ENABLED: 'true',
  };

  beforeEach(async () => {
    configGet = jest.fn((key: string) => (baseEnv as Record<string, string>)[key]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsletterSyncService,
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();
    service = module.get(NewsletterSyncService);
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  it('isEnabled: true por defecto, solo false explícito desactiva', () => {
    expect(service.isEnabled()).toBe(true);
    configGet.mockImplementation((key: string) =>
      key === 'NEWSLETTER_SYNC_ENABLED' ? 'false' : (baseEnv as Record<string, string>)[key],
    );
    expect(service.isEnabled()).toBe(false);
  });

  it('syncSubscribe postea al CMS con API key y consentAt (CA-03)', async () => {
    const ok = await service.syncSubscribe({
      email: 'nuevo@portaqr.cl',
      name: 'Ana',
      userId: 'u-1',
      source: 'signup',
    });
    expect(ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://cms.portaqr.cl/api/newsletter/sync');
    expect((init.headers as Record<string, string>)['x-newsletter-api-key']).toBe('secret-key');
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ email: 'nuevo@portaqr.cl', userId: 'u-1', source: 'signup' });
    expect(typeof body.consentAt).toBe('string');
  });

  it('syncSubscribe: CMS no configurado → false sin fetch (warn)', async () => {
    configGet.mockReturnValue('');
    await expect(
      service.syncSubscribe({ email: 'a@b.cl', userId: 'u-1', source: 'signup' }),
    ).resolves.toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('syncSubscribe: kill-switch → false sin fetch', async () => {
    configGet.mockImplementation((key: string) =>
      key === 'NEWSLETTER_SYNC_ENABLED' ? 'false' : (baseEnv as Record<string, string>)[key],
    );
    await expect(
      service.syncSubscribe({ email: 'a@b.cl', userId: 'u-1', source: 'signup' }),
    ).resolves.toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('syncSubscribe: CMS 500 o caída de red → false, nunca lanza (RN-2)', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    await expect(
      service.syncSubscribe({ email: 'a@b.cl', userId: 'u-1', source: 'signup' }),
    ).resolves.toBe(false);
    fetchSpy.mockRejectedValueOnce(new Error('red caída'));
    await expect(
      service.syncSubscribe({ email: 'a@b.cl', userId: 'u-1', source: 'signup' }),
    ).resolves.toBe(false);
  });

  it('syncUnsubscribe postea a unsubscribe-by-email con el email', async () => {
    const ok = await service.syncUnsubscribe('a@b.cl', 'u-1');
    expect(ok).toBe(true);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://cms.portaqr.cl/api/newsletter/unsubscribe-by-email');
    expect(JSON.parse(init.body as string)).toEqual({ email: 'a@b.cl' });
  });
});
