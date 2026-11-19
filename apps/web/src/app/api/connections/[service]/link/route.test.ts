import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiFetch } from '@/lib/api/client';

import { createRateLimiter } from './rateLimit';
import { POST } from './route';

vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch: vi.fn(),
}));

const BODY = { code: '4829', cookies: [] };

const on = (service: string) => ({ params: Promise.resolve({ service }) });
const NETFLIX = on('netflix');

let address = 0;
/** A fresh address per request, so the limiter only counts where a test means it to */
const request = (body: unknown = BODY, from = `10.0.0.${++address}`) =>
  new Request('https://www.tvseri.es/api/connections/netflix/link', {
    body: JSON.stringify(body),
    headers: { 'x-forwarded-for': from },
    method: 'POST',
  });

beforeEach(() => {
  vi.mocked(apiFetch).mockReset();
});

describe('POST /api/connections/:service/link', () => {
  it('passes the API’s success through', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, profile: 'Koen' });
    const response = await POST(request(), NETFLIX);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, profile: 'Koen' });
  });

  it('is a 404 for a service it can’t connect, without calling the API', async () => {
    const response = await POST(request(), on('hulu'));
    expect(response.status).toBe(404);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('forwards to the service’s own link route', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, profile: 'Koen' });
    await POST(request(), NETFLIX);
    expect(apiFetch).toHaveBeenCalledWith(
      '/connections/:service/link',
      expect.objectContaining({ params: { service: 'netflix' } }),
    );
  });

  it('sends the client’s address along, never one the body claims', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, profile: 'Koen' });
    await POST(
      request({ ...BODY, address: '1.2.3.4' }, '203.0.113.5, 10.0.0.1'),
      NETFLIX,
    );
    expect(apiFetch).toHaveBeenCalledWith(
      '/connections/:service/link',
      expect.objectContaining({
        body: expect.objectContaining({ address: '203.0.113.5' }),
      }),
    );
  });

  it('forwards only the parsed fields: unknown keys and unfit cookies stay behind', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, profile: 'Koen' });
    const fit = {
      domain: '.netflix.com',
      expiresDate: null,
      httpOnly: true,
      name: 'NetflixId',
      path: '/',
      sameSite: null,
      secure: true,
      value: 'v1',
    };
    await POST(
      request(
        {
          code: '4829',
          cookies: [fit, { ...fit, name: 'bad name' }],
          extra: 'smuggled',
          userAgent: 'Mozilla/5.0',
        },
        '203.0.113.7',
      ),
      NETFLIX,
    );
    expect(vi.mocked(apiFetch).mock.calls[0]?.[1]?.body).toEqual({
      address: '203.0.113.7',
      code: '4829',
      cookies: [fit],
      userAgent: 'Mozilla/5.0',
    });
  });

  it('refuses a malformed body as a bad code without calling the API', async () => {
    const response = await POST(request({ code: 'abcd' }), NETFLIX);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, reason: 'bad-code' });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it.each([
    [new ApiError(400, 'BadCode'), 400, 'bad-code'],
    [new ApiError(404), 404, 'bad-code'],
    [new ApiError(429), 429, 'rate-limited'],
    [
      new ApiError(422, undefined, { ok: false, reason: 'signed-out' }),
      422,
      'signed-out',
    ],
    [
      new ApiError(422, undefined, { ok: false, reason: 'test-read-failed' }),
      422,
      'test-read-failed',
    ],
    [new ApiError(422, undefined, 'garbled'), 502, 'unavailable'],
    [new ApiError(500), 502, 'unavailable'],
    [new ApiError(503), 502, 'unavailable'],
    [new ApiError(0, 'ApiNetworkError'), 502, 'unavailable'],
    [new Error('boom'), 502, 'unavailable'],
  ])('maps %o to %i %s', async (error, status, reason) => {
    vi.mocked(apiFetch).mockRejectedValue(error);
    const response = await POST(request(), NETFLIX);
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ ok: false, reason });
  });

  it('rate-limits one address after ten tries a minute', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new ApiError(400));
    for (let i = 0; i < 10; i++) {
      expect((await POST(request(BODY, '203.0.113.9'), NETFLIX)).status).toBe(
        400,
      );
    }
    const blocked = await POST(request(BODY, '203.0.113.9'), NETFLIX);
    expect(blocked.status).toBe(429);
    expect(apiFetch).toHaveBeenCalledTimes(10);
    expect((await POST(request(BODY, '203.0.113.10'), NETFLIX)).status).toBe(
      400,
    );
  });
});

describe('createRateLimiter', () => {
  it('lets a key try again once its window has passed', () => {
    const limiter = createRateLimiter({ max: 2, maxKeys: 10, windowMs: 1000 });
    expect(limiter.allow('a', 0)).toBe(true);
    expect(limiter.allow('a', 10)).toBe(true);
    expect(limiter.allow('a', 20)).toBe(false);
    expect(limiter.allow('a', 1011)).toBe(true);
  });

  it('drops expired keys when it reaches its cap', () => {
    const limiter = createRateLimiter({ max: 1, maxKeys: 3, windowMs: 1000 });
    limiter.allow('a', 0);
    limiter.allow('b', 0);
    limiter.allow('c', 0);
    limiter.allow('d', 2000);
    expect(limiter.size).toBe(1);
  });

  it('never holds more keys than its cap, dropping the least recent', () => {
    const limiter = createRateLimiter({ max: 1, maxKeys: 3, windowMs: 1000 });
    for (const key of ['a', 'b', 'c', 'd', 'e']) {
      limiter.allow(key, 0);
    }
    expect(limiter.size).toBe(3);
    // 'e' is still held and limited; 'a' was dropped and may try again
    expect(limiter.allow('e', 1)).toBe(false);
    expect(limiter.allow('a', 1)).toBe(true);
  });
});
