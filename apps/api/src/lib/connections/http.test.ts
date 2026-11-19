import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getJson, getText, retryAfterSeconds } from './http';
import { cookieJar } from './jar';

const { pauses } = vi.hoisted(() => ({ pauses: [] as number[] }));
vi.mock('@tvseri.es/utils', async (original) => ({
  ...(await original<typeof import('@tvseri.es/utils')>()),
  sleep: async (ms: number) => {
    pauses.push(ms);
  },
}));

const URL_ = 'https://service.example/history';
const OWN = { redirect: () => 'follow' as const };

const torn = () =>
  new Response(
    new ReadableStream({
      start: (controller) => controller.error(new Error('reset')),
    }),
  );

const timeout = () => {
  throw new DOMException('The operation timed out.', 'TimeoutError');
};
const reset = () => {
  throw new TypeError('fetch failed', {
    cause: Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' }),
  });
};

type Step = () => Response;

/** Answers each request with the next step; the last repeats */
const answering = (...steps: ReadonlyArray<Step>) => {
  const fetchMock = vi.fn(async () => {
    const step =
      steps[Math.min(fetchMock.mock.calls.length - 1, steps.length - 1)];
    return (step as Step)();
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const ok = () => Response.json({ fine: true });
const status =
  (code: number, headers: Record<string, string> = {}): Step =>
  () =>
    new Response('nope', { headers, status: code });

beforeEach(() => {
  pauses.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('a transient failure', () => {
  it.each([
    ['a timeout', timeout],
    ['a connection reset', reset],
    ['a body cut off mid-read', torn],
    ['a 502', status(502)],
    ['a 503', status(503)],
    ['a 504', status(504)],
  ])('is asked once more after a short pause: %s', async (_, first) => {
    const fetchMock = answering(first, ok);
    expect(await getJson(URL_, {}, OWN)).toEqual({
      body: { fine: true },
      ok: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(pauses).toHaveLength(1);
    expect(pauses[0]).toBeGreaterThanOrEqual(1000);
    expect(pauses[0]).toBeLessThanOrEqual(3000);
  });

  it.each([
    ['timeouts', timeout],
    ['resets', reset],
    ['503s', status(503)],
  ])(
    'is unavailable when it fails twice (%s), and never signed out',
    async (_, step) => {
      const fetchMock = answering(step);
      expect(await getText(URL_, {}, OWN)).toEqual({
        ok: false,
        reason: 'unavailable',
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
  );

  it.each([
    ['a 429', status(429), 'unavailable'],
    ['a 500', status(500), 'unavailable'],
    ['a 404', status(404), 'read-failed'],
    ['a 401', status(401), 'signed-out'],
  ])('is not what %s is: asked once', async (_, step, reason) => {
    const fetchMock = answering(step);
    expect(await getText(URL_, {}, OWN)).toEqual({ ok: false, reason });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(pauses).toEqual([]);
  });

  it.each([
    ['503', '1'],
    ['502', '0'],
  ])(
    'is asked once more when a %s says to come back in %ss',
    async (code, after) => {
      const fetchMock = answering(
        status(Number(code), { 'retry-after': after }),
        ok,
      );
      expect(await getText(URL_, {}, OWN)).toEqual({
        ok: true,
        text: '{"fine":true}',
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
  );

  it('carries a 504’s Retry-After when it fails twice', async () => {
    answering(status(504, { 'retry-after': '2' }));
    expect(await getText(URL_, {}, OWN)).toEqual({
      ok: false,
      reason: 'unavailable',
      retryAfterSeconds: 60,
    });
  });

  it('is not asked again quickly when a 503 says when to come back', async () => {
    const fetchMock = answering(status(503, { 'retry-after': '120' }), ok);
    expect(await getText(URL_, {}, OWN)).toEqual({
      ok: false,
      reason: 'unavailable',
      retryAfterSeconds: 120,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('renews the jar from both answers', async () => {
    const cookies: string[][] = [];
    answering(
      () =>
        new Response('', {
          headers: { 'set-cookie': 'a=1; Path=/' },
          status: 502,
        }),
      ok,
    );
    await getText(
      URL_,
      {},
      {
        ...OWN,
        jar: {
          cookies: () => [],
          header: () => '',
          renew: (lines) => {
            cookies.push([...lines]);
          },
          renewed: () => false,
        },
      },
    );
    expect(cookies).toEqual([['a=1; Path=/'], []]);
  });
});

describe('Retry-After', () => {
  const NOW = Date.parse('2026-11-19T12:00:00Z');

  it.each([
    ['seconds', '600', 600],
    ['an HTTP date', 'Thu, 19 Nov 2026 12:10:00 GMT', 600],
    ['too soon: a minute at least', '5', 60],
    ['a past date: a minute at least', 'Thu, 19 Nov 2026 11:00:00 GMT', 60],
    ['too far: an hour at most', '86400', 3600],
  ])('reads %s', (_, value, seconds) => {
    expect(retryAfterSeconds(new Headers({ 'retry-after': value }), NOW)).toBe(
      seconds,
    );
  });

  it.each([
    ['absent', null],
    ['garbled', 'soon'],
  ])('is null when %s', (_, value) => {
    const headers = new Headers(value ? { 'retry-after': value } : {});
    expect(retryAfterSeconds(headers, NOW)).toBeNull();
  });

  it('comes with a 429 refusal', async () => {
    answering(status(429, { 'retry-after': '900' }));
    expect(await getText(URL_, {}, OWN)).toEqual({
      ok: false,
      reason: 'unavailable',
      retryAfterSeconds: 900,
    });
  });
});

describe('a jar a header can’t carry', () => {
  it('fails the read as no answer, never with the cookie in an error', async () => {
    const fetchMock = answering(ok);
    const jar = cookieJar(
      [
        {
          domain: '.service.example',
          expiresDate: null,
          httpOnly: true,
          name: 'session',
          path: '/',
          sameSite: null,
          secure: true,
          value: 'secret-value\r\nx-injected: 1',
        },
      ],
      'service.example',
    );
    await expect(getText(URL_, {}, { ...OWN, jar })).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
