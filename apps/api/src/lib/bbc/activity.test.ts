import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cookieJar } from '@/lib/connections/jar';

import { readActivityPage } from './activity';
import { BBC_SITE } from './iplayer';

const FAKE_KEY = 'FakeKey123abc';

const { clientKey, dropClientKey } = vi.hoisted(() => ({
  clientKey: vi.fn(async (): Promise<string | null> => 'FakeKey123abc'),
  dropClientKey: vi.fn(),
}));
vi.mock('./clientKey', () => ({ clientKey, dropClientKey }));
vi.mock('@tvseri.es/utils', async (original) => ({
  ...(await original<typeof import('@tvseri.es/utils')>()),
  sleep: async () => {},
}));

const jar = () =>
  cookieJar(
    [
      {
        domain: '.bbc.co.uk',
        expiresDate: null,
        httpOnly: true,
        name: 'ckns_atkn',
        path: '/',
        sameSite: null,
        secure: true,
        value: 'session-value',
      },
    ],
    BBC_SITE,
  );

const play = (
  resourceId: string,
  action: string,
  offset: string,
  created: string,
  extra: Record<string, unknown> = {},
) => ({
  '@id': `urn:bbc:tv:episode:${resourceId}`,
  action,
  actionContext: `urn:bbc:tv:version_offset:p0ver${resourceId.slice(-3)}#${offset}`,
  activityType: 'plays',
  created,
  resourceDomain: 'tv',
  resourceId,
  resourceType: 'episode',
  ...extra,
});

const PAGE = {
  _links: [],
  items: [
    play('m0020aaa', 'ended', '3500', '2026-11-01T18:34:23Z'),
    play('m0020bbb', 'heartbeat', '120.5', '2026-10-30T20:00:00Z'),
    // A live stream's play: no offset
    play('m0020ccc', 'ended', 'undefined', '2026-10-29T21:00:00Z', {
      playMode: 'live',
    }),
    // Not a date: left out
    play('m0020ddd', 'ended', '10', 'yesterday'),
    // A PID outside the review list's keys: left out
    play('m0020 eee', 'ended', '10', '2026-10-28T21:00:00Z'),
    // Not a play at all
    { resourceId: 'm0020fff' },
    // An action the client doesn't know yet, a field it doesn't either
    play('m0020ggg', 'rewound', '60', '2026-10-27T21:00:00Z', { mood: 'x' }),
  ],
  pagination: { itemsPerPage: 100, startIndex: 0 },
  total: 392,
};

const fetchMock = vi.fn(
  async (_url: string, _init?: RequestInit): Promise<Response> =>
    Response.json(PAGE),
);

const text = (status: number, body: string) =>
  vi.fn(async () => new Response(body, { status }));

beforeEach(() => {
  fetchMock.mockClear();
  clientKey.mockClear();
  dropClientKey.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('readActivityPage', () => {
  it('asks for a page of TV episode plays with the cookies and the client key', async () => {
    await readActivityPage(jar(), 2);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      { headers: Headers },
    ];
    expect(url).toBe(
      'https://activity.api.bbc.co.uk/my/plays?items=100&resourceDomain=tv&resourceType=episode&startIndex=200',
    );
    expect(init.headers.get('x-api-key')).toBe(FAKE_KEY);
    expect(init.headers.get('cookie')).toBe('ckns_atkn=session-value');
    expect(init.headers.get('origin')).toBe('https://www.bbc.co.uk');
  });

  it('reads each play: its episode, how it ended, where, and when', async () => {
    expect(await readActivityPage(jar(), 0)).toEqual({
      end: false,
      invalid: 3,
      ok: true,
      plays: [
        {
          action: 'ended',
          live: false,
          offset: 3500,
          pid: 'm0020aaa',
          versionPid: 'p0veraaa',
          watchedAt: Date.parse('2026-11-01T18:34:23Z'),
        },
        {
          action: 'heartbeat',
          live: false,
          offset: 120.5,
          pid: 'm0020bbb',
          versionPid: 'p0verbbb',
          watchedAt: Date.parse('2026-10-30T20:00:00Z'),
        },
        {
          action: 'ended',
          live: true,
          offset: null,
          pid: 'm0020ccc',
          versionPid: 'p0verccc',
          watchedAt: Date.parse('2026-10-29T21:00:00Z'),
        },
        {
          action: 'rewound',
          live: false,
          offset: 60,
          pid: 'm0020ggg',
          versionPid: 'p0verggg',
          watchedAt: Date.parse('2026-10-27T21:00:00Z'),
        },
      ],
      total: 392,
    });
  });

  it('reads a page past the last as the end of the history', async () => {
    vi.stubGlobal(
      'fetch',
      text(
        400,
        'myactivity.plays.invalidRequestParam : Invalid page parameters in request. StartIndex [400] is higher than the number of available activities [392]\n',
      ),
    );
    expect(await readActivityPage(jar(), 4)).toEqual({
      end: true,
      invalid: 0,
      ok: true,
      plays: [],
      total: null,
    });
  });

  it('drops a refused client key and tries later', async () => {
    vi.stubGlobal(
      'fetch',
      text(
        400,
        'myactivity.plays.invalidRequestParam : validClientKey -> Client key is either not present or not valid\n',
      ),
    );
    expect(await readActivityPage(jar(), 0)).toEqual({
      ok: false,
      reason: 'unavailable',
    });
    expect(dropClientKey).toHaveBeenCalledOnce();
  });

  it('tries later when the key can’t be found, without asking the service', async () => {
    clientKey.mockResolvedValueOnce(null);
    expect(await readActivityPage(jar(), 0)).toEqual({
      ok: false,
      reason: 'unavailable',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps the service’s refusals to the shared reasons', async () => {
    for (const [status, reason] of [
      [401, 'signed-out'],
      [403, 'signed-out'],
      [429, 'unavailable'],
      [503, 'unavailable'],
      [404, 'read-failed'],
      [400, 'read-failed'],
      [302, 'changed'],
    ] as const) {
      vi.stubGlobal('fetch', text(status, '{"key":"tokenNotSupplied"}'));
      expect(await readActivityPage(jar(), 0), String(status)).toEqual({
        ok: false,
        reason,
      });
    }
  });

  it.each([
    ['in seconds', '120', 120],
    ['as a date', new Date(Date.now() + 30 * 60_000).toUTCString(), 1800],
  ])(
    'carries a 429’s Retry-After %s to the loop',
    async (_, retryAfter, seconds) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(
          async () =>
            new Response('{}', {
              headers: { 'retry-after': retryAfter },
              status: 429,
            }),
        ),
      );
      const read = await readActivityPage(jar(), 0);
      expect(read).toMatchObject({ ok: false, reason: 'unavailable' });
      // A date is read against the clock: a second either way
      expect(
        !read.ok && Math.abs((read.retryAfterSeconds ?? 0) - seconds),
      ).toBeLessThanOrEqual(1);
    },
  );

  it.each([502, 503, 504])(
    'asks once more after a %s, and reads the page',
    async (status) => {
      fetchMock.mockResolvedValueOnce(new Response('', { status }));
      expect(await readActivityPage(jar(), 0)).toMatchObject({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
  );

  it('asks once more after a dropped connection', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    expect(await readActivityPage(jar(), 0)).toMatchObject({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('tries later when the connection drops twice', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    expect(await readActivityPage(jar(), 0)).toEqual({
      ok: false,
      reason: 'unavailable',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => Response.json(PAGE));
  });

  it('says the answer changed when it is not the documented shape', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ plays: [] })),
    );
    expect(await readActivityPage(jar(), 0)).toEqual({
      ok: false,
      reason: 'changed',
    });
    vi.stubGlobal('fetch', text(200, '<html>'));
    expect(await readActivityPage(jar(), 0)).toEqual({
      ok: false,
      reason: 'changed',
    });
  });

  it('keeps what the service renews', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify(PAGE), {
            headers: {
              'set-cookie': 'ckns_atkn=renewed; Domain=.bbc.co.uk; Path=/',
            },
          }),
      ),
    );
    const session = jar();
    await readActivityPage(session, 0);
    expect(session.header()).toBe('ckns_atkn=renewed');
  });
});

describe('an expired access token', () => {
  const SESSION = 'https://session.bbc.co.uk/session';
  const REFUSED = () =>
    new Response('{"key":"tokenNotSupplied"}', { status: 401 });
  const RENEWED = () =>
    new Response('{}', {
      headers: {
        'set-cookie':
          'ckns_atkn=fresh-value; Domain=.bbc.co.uk; Path=/; Secure; HttpOnly',
      },
    });

  /** Answers the session call with `renewal`, the history with `pages` in turn */
  const serve = (renewal: () => Response, pages: Array<() => Response>) => {
    const asked: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        asked.push(url);
        if (url.startsWith(SESSION)) {
          return renewal();
        }
        return (pages.shift() ?? (() => Response.json(PAGE)))();
      }),
    );
    return asked;
  };

  it('is renewed through the BBC’s session, as iPlayer’s pages do, and the page read again', async () => {
    const asked = serve(RENEWED, [REFUSED]);
    const session = jar();
    expect(await readActivityPage(session, 0)).toMatchObject({ ok: true });
    expect(asked.map((url) => new URL(url).host)).toEqual([
      'activity.api.bbc.co.uk',
      'session.bbc.co.uk',
      'activity.api.bbc.co.uk',
    ]);
    expect(session.header()).toBe('ckns_atkn=fresh-value');
    expect(session.renewed()).toBe(true);
  });

  it('means signed out when the session gives no new token', async () => {
    const asked = serve(() => new Response('{}'), [REFUSED]);
    expect(await readActivityPage(jar(), 0)).toEqual({
      ok: false,
      reason: 'signed-out',
    });
    expect(asked).toHaveLength(2);
  });

  it.each([401, 403, 302])(
    'means signed out when the session answers %s',
    async (status) => {
      serve(() => new Response(null, { status }), [REFUSED]);
      expect(await readActivityPage(jar(), 0)).toEqual({
        ok: false,
        reason: 'signed-out',
      });
    },
  );

  it('tries later when the session service is down: the viewer may still be signed in', async () => {
    serve(() => new Response(null, { status: 503 }), [REFUSED]);
    expect(await readActivityPage(jar(), 0)).toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('renews once: a refusal with the new token is signed out', async () => {
    const asked = serve(RENEWED, [REFUSED, REFUSED]);
    expect(await readActivityPage(jar(), 0)).toEqual({
      ok: false,
      reason: 'signed-out',
    });
    expect(asked.filter((url) => url.startsWith(SESSION))).toHaveLength(1);
  });
});
