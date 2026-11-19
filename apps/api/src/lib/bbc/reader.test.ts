import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { secretFromCookies } from '@/lib/connections/jar';

import { bbcReader } from './reader';

vi.mock('./clientKey', () => ({
  clientKey: async () => 'FakeKey123abc',
  dropClientKey: () => {},
}));
vi.mock('@tvseri.es/utils', async (original) => ({
  ...(await original<typeof import('@tvseri.es/utils')>()),
  sleep: async () => {},
}));

const JAR = [
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
];

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.parse('2026-11-01T20:00:00Z');
const iso = (at: number) => new Date(at).toISOString().replace('.000', '');

const play = (
  pid: string,
  action: string,
  offset: number | 'undefined',
  at: number,
  extra: Record<string, unknown> = {},
) => ({
  action,
  actionContext: `urn:bbc:tv:version_offset:p0ver${pid.slice(-3)}#${offset}`,
  activityType: 'plays',
  created: iso(at),
  resourceDomain: 'tv',
  resourceId: pid,
  resourceType: 'episode',
  ...extra,
});

const FIRST_PAGE = [
  // Finished, by the player's own word
  play('m0020aaa', 'ended', 3500, T0),
  // Stopped halfway: not watched yet
  play('m0020bbb', 'paused', 900, T0 - DAY),
  // A heartbeat in the credits counts as watched
  play('m0020ccc', 'heartbeat', 3480, T0 - 2 * DAY),
  // A film: counted, no row
  play('m0020ddd', 'ended', 6000, T0 - 3 * DAY),
  // Gone from iPlayer: /programmes names it
  play('m0020eee', 'ended', 1600, T0 - 4 * DAY),
  // Known nowhere: left out, the page carries on
  play('m0020fff', 'ended', 100, T0 - 5 * DAY),
  // A live stream stopped: not an episode finished
  play('m0020ggg', 'ended', 'undefined', T0 - 6 * DAY, { playMode: 'live' }),
];

const SECOND_PAGE = [play('m0020hhh', 'paused', 10, T0 - 30 * DAY)];

let history: ReadonlyArray<ReadonlyArray<unknown>> = [];

const episode = (
  id: string,
  title: string,
  subtitle: string,
  position: number | null,
  duration = 'PT59M',
) => ({
  id,
  parent_position: position,
  subtitle,
  title,
  tleo_id: 'b0show',
  versions: [{ duration: { value: duration } }],
});

const CATALOGUE = [
  episode('m0020aaa', 'Harbour Lights', 'Series 2: 3. The Tide', 3),
  episode('m0020bbb', 'Harbour Lights', 'Series 2: 4. The Wreck', 4),
  episode('m0020ccc', 'Fen Country', 'Series 1: Episode 6', null),
  episode('m0020ddd', 'The Long Walk Home', '', null, 'PT1H45M'),
  episode('m0020ggg', 'Evening News', '', null, 'PT30M'),
  episode('m0020hhh', 'Harbour Lights', 'Series 1: 1. The Pier', 1),
];

const PROGRAMMES: Record<string, unknown> = {
  m0020eee: {
    programme: {
      parent: {
        programme: {
          parent: {
            programme: { pid: 'b0dove', title: 'Dove', type: 'brand' },
          },
          pid: 'b0dove2',
          title: 'Series 2',
          type: 'series',
        },
      },
      position: 5,
      title: 'Bar Mitzvah',
      type: 'episode',
      versions: [{ canonical: 1, duration: 1620, pid: 'p0vereee' }],
    },
  },
};

const fetchMock = vi.fn(async (url: string): Promise<Response> => {
  const at = new URL(url);
  if (at.hostname === 'activity.api.bbc.co.uk') {
    const page = Number(at.searchParams.get('startIndex')) / 100;
    const items = history[page];
    const total = history.reduce((sum, rows) => sum + rows.length, 0);
    return items
      ? Response.json({ items, pagination: {}, total })
      : new Response(
          `myactivity.plays.invalidRequestParam : Invalid page parameters in request. StartIndex [${page * 100}] is higher than the number of available activities [${total}]`,
          { status: 400 },
        );
  }
  if (at.pathname.startsWith('/programmes/')) {
    const pid = at.pathname.split('/')[2]?.replace('.json', '') ?? '';
    const body = PROGRAMMES[pid];
    return body ? Response.json(body) : new Response(null, { status: 404 });
  }
  const ids = url.split('/episodes/')[1]?.split(',') ?? [];
  return Response.json({
    episodes: CATALOGUE.filter((entry) => ids.includes(entry.id)),
  });
});

beforeEach(() => {
  history = [FIRST_PAGE, SECOND_PAGE];
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const opened = async () => {
  const session = await bbcReader.open(secretFromCookies(JAR), 'default');
  if (!session.ok) {
    throw new Error('not opened');
  }
  return session.session;
};

const harbour = (episodeNumber: number, index: number, at: number) => ({
  episode: episodeNumber,
  index,
  season: 'Series 2',
  title: 'Harbour Lights',
  watchedAt: at,
  watchProvider: 'BBC iPlayer',
});

describe('bbcReader.link', () => {
  it('reads the first page once and stores the jar', async () => {
    expect(await bbcReader.link(JAR)).toEqual({
      latest: {
        episodeTitle: 'Series 2: 3. The Tide',
        title: 'Harbour Lights',
        watchedAt: T0,
      },
      ok: true,
      profileId: 'default',
      profileName: null,
      secret: secretFromCookies(JAR),
      // The service's own count of every play
      total: 8,
    });
    const activity = fetchMock.mock.calls.filter(([url]) =>
      url.includes('activity.api'),
    );
    expect(activity).toHaveLength(1);
  });

  it('links an account that has played nothing yet', async () => {
    history = [];
    expect(await bbcReader.link(JAR)).toMatchObject({
      latest: null,
      ok: true,
      total: 0,
    });
  });

  it('passes the BBC’s refusal on', async () => {
    fetchMock.mockImplementationOnce(
      async () => new Response('{"key":"tokenNotSupplied"}', { status: 401 }),
    );
    expect(await bbcReader.link(JAR)).toEqual({
      ok: false,
      reason: 'signed-out',
    });
  });

  it('links without an overview when the catalogue is down', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes('activity.api')
        ? Response.json({ items: FIRST_PAGE, total: 7 })
        : new Response(null, { status: 503 }),
    );
    expect(await bbcReader.link(JAR)).toMatchObject({
      latest: null,
      ok: true,
      total: 7,
    });
  });
});

describe('bbcReader.open', () => {
  it('refuses a secret that isn’t a jar', async () => {
    expect(await bbcReader.open('nonsense', 'default')).toEqual({
      ok: false,
      reason: 'read-failed',
    });
  });

  it('keeps the stored secret as it was', async () => {
    const secret = secretFromCookies(JAR);
    const session = await bbcReader.open(secret, 'default');
    expect(session.ok && session.session.secret).toBe(secret);
  });

  it('reads the watched plays of a page, each dated by its play', async () => {
    const session = await opened();
    expect(await session.readPage(0)).toEqual({
      ok: true,
      page: {
        entries: [
          { key: 'm0020aaa', row: harbour(3, 0, T0), watchedAt: T0 },
          {
            key: 'm0020ccc',
            row: {
              episode: 6,
              index: 2,
              season: 'Series 1',
              title: 'Fen Country',
              watchedAt: T0 - 2 * DAY,
              watchProvider: 'BBC iPlayer',
            },
            watchedAt: T0 - 2 * DAY,
          },
          { key: 'm0020ddd', row: null, watchedAt: T0 - 3 * DAY },
          {
            key: 'm0020eee',
            row: {
              episode: 5,
              index: 4,
              season: 'Series 2',
              title: 'Dove',
              watchedAt: T0 - 4 * DAY,
              watchProvider: 'BBC iPlayer',
            },
            watchedAt: T0 - 4 * DAY,
          },
        ],
        invalid: 0,
        more: true,
      },
    });
  });

  it('reads on past a page with nothing watched, to the page past the last', async () => {
    const session = await opened();
    expect(await session.readPage(1)).toEqual({
      ok: true,
      page: { entries: [], invalid: 0, more: true },
    });
    expect(await session.readPage(2)).toEqual({
      ok: true,
      page: { entries: [], invalid: 0 },
    });
  });

  it('counts a play the catalogue doesn’t know as left out, not as a failed page', async () => {
    const session = await opened();
    await session.readPage(0);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('1 plays left out'),
    );
  });

  it('tries the page later when iPlayer’s catalogue says when to come back', async () => {
    const session = await opened();
    fetchMock.mockImplementation(async (url: string) =>
      url.includes('activity.api')
        ? Response.json({ items: FIRST_PAGE, total: 7 })
        : new Response(null, { headers: { 'retry-after': '90' }, status: 429 }),
    );
    expect(await session.readPage(0)).toEqual({
      ok: false,
      reason: 'unavailable',
      retryAfterSeconds: 90,
    });
  });

  it('tries the page later when iPlayer’s catalogue is down', async () => {
    const session = await opened();
    fetchMock.mockImplementation(async (url: string) =>
      url.includes('activity.api')
        ? Response.json({ items: FIRST_PAGE, total: 7 })
        : new Response(null, { status: 503 }),
    );
    expect(await session.readPage(0)).toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('says the answer changed when no play on the page is in the documented shape', async () => {
    history = [[{ resourceId: 'm0020aaa' }, { nothing: true }]];
    const session = await opened();
    expect(await session.readPage(0)).toEqual({
      ok: false,
      reason: 'changed',
    });
  });

  it('asks the catalogue nothing about a live play it can’t count', async () => {
    const session = await opened();
    await session.readPage(0);
    const asked = fetchMock.mock.calls
      .map(([url]) => url)
      .filter((url) => !url.includes('activity.api'))
      .join(' ');
    expect(asked).not.toContain('m0020ggg');
  });

  it('ends at a page without any play', async () => {
    history = [[]];
    const session = await opened();
    expect(await session.readPage(0)).toEqual({
      ok: true,
      page: { entries: [], invalid: 0, more: false },
    });
  });

  /** Plays of episodes only /programmes knows, `busy` of them while it is down */
  const expired = (count: number, busy: number) => {
    const pids = Array.from({ length: count }, (_, at) => `m0030x${at}`);
    history = [pids.map((pid, at) => play(pid, 'ended', 100, T0 - at * DAY))];
    const route = fetchMock.getMockImplementation();
    fetchMock.mockImplementation(async (url: string) => {
      const pid = pids.find((entry) =>
        url.endsWith(`/programmes/${entry}.json`),
      );
      if (!pid) {
        return route!(url);
      }
      return pids.indexOf(pid) < busy
        ? new Response(null, { status: 503 })
        : Response.json({
            programme: {
              position: 1,
              title: pid,
              type: 'episode',
              versions: [],
            },
          });
    });
    return pids;
  };

  it('leaves out an episode /programmes can’t answer for now, and reads the rest', async () => {
    expired(5, 2);
    const session = await opened();
    const read = await session.readPage(0);
    expect('page' in read && read.page.entries.map(({ key }) => key)).toEqual([
      'm0030x2',
      'm0030x3',
      'm0030x4',
    ]);
  });

  it('tries the page later when /programmes is down for several episodes', async () => {
    expired(5, 3);
    const session = await opened();
    expect(await session.readPage(0)).toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });
});
