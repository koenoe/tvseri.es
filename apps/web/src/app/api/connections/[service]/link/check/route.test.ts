import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiFetch } from '@/lib/api/client';

import { POST } from './route';

vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch: vi.fn(),
}));

const BODY = { code: '4829' };

const on = (service: string) => ({ params: Promise.resolve({ service }) });
const NETFLIX = on('netflix');

let address = 0;
/** A fresh address per request, so the limiter only counts where a test means it to */
const request = (body: unknown = BODY, from = `10.0.1.${++address}`) =>
  new Request('https://www.tvseri.es/api/connections/netflix/link/check', {
    body: JSON.stringify(body),
    headers: { 'x-forwarded-for': from },
    method: 'POST',
  });

beforeEach(() => {
  vi.mocked(apiFetch).mockReset();
});

describe('POST /api/connections/:service/link/check', () => {
  it('passes the code’s account through', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, username: 'jemoeder' });
    const response = await POST(request(), NETFLIX);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, username: 'jemoeder' });
  });

  it('forwards the code and the client’s address, never one the body claims', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, username: 'jemoeder' });
    await POST(
      request({ ...BODY, address: '1.2.3.4' }, '203.0.113.5, 10.0.0.1'),
      NETFLIX,
    );
    expect(apiFetch).toHaveBeenCalledWith(
      '/connections/:service/link/check',
      expect.objectContaining({
        body: { address: '203.0.113.5', code: '4829' },
        method: 'POST',
        params: { service: 'netflix' },
      }),
    );
  });

  it('is a 404 for a service it can’t connect, without calling the API', async () => {
    const response = await POST(request(), on('hulu'));
    expect(response.status).toBe(404);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('refuses a malformed code as a bad code without calling the API', async () => {
    const response = await POST(request({ code: '48' }), NETFLIX);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, reason: 'bad-code' });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it.each([
    [new ApiError(404), 404, 'bad-code'],
    [new ApiError(429), 429, 'rate-limited'],
    [new ApiError(500), 502, 'unavailable'],
    [new ApiError(0, 'ApiNetworkError'), 502, 'unavailable'],
  ])('maps %o to %i %s', async (error, status, reason) => {
    vi.mocked(apiFetch).mockRejectedValue(error);
    const response = await POST(request(), NETFLIX);
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ ok: false, reason });
  });

  it('rate-limits one address after ten checks a minute', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new ApiError(404));
    for (let i = 0; i < 10; i++) {
      expect((await POST(request(BODY, '203.0.113.9'), NETFLIX)).status).toBe(
        404,
      );
    }
    expect((await POST(request(BODY, '203.0.113.9'), NETFLIX)).status).toBe(
      429,
    );
    expect(apiFetch).toHaveBeenCalledTimes(10);
  });
});
