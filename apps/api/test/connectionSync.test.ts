import { TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';
import { KMSClient } from '@aws-sdk/client-kms';
import { NETFLIX_WATCH_PROVIDER } from '@tvseri.es/constants';
import { MATCHER_VERSION } from '@tvseri.es/import';
import type { ConnectionCookie } from '@tvseri.es/schemas';
import type { SQSEvent } from 'aws-lambda';
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';

import { handler } from '@/lambdas/connectionSync';
import { decryptSecret, encryptSecret } from '@/lib/connections/crypto';
import { cookiesFromSecret, mergeSetCookies } from '@/lib/connections/jar';
import type { HistoryEntry, ServiceReader } from '@/lib/connections/reader';
import type { ConnectionSyncMessage } from '@/lib/connections/request';
import { runSync, syncTag } from '@/lib/connections/sync';
import {
  deleteConnection,
  getConnection,
  saveConnection,
} from '@/lib/db/connections';
import { MAX_OPEN } from '@/lib/db/connections/unresolved';
import { writeWatchedBatch } from '@/lib/imports/write';

import { db, sqsMessages } from './db';
import { fakeFetch, onTmdb } from './fakeHttp';
import { fakeKms } from './fakeKms';
import { fakeShow } from './fixtures/tmdb';
import { lambdaContext } from './lambdaContext';
import { request } from './request';
import { seedUser, USER_ID } from './seed';

// The shared quick retry's pause (lib/connections/http) would make a
// transient failure's test seconds long
vi.mock('@tvseri.es/utils', async (original) => ({
  ...(await original<typeof import('@tvseri.es/utils')>()),
  sleep: async () => {},
}));

/**
 * The connection sync end to end through the real Netflix reader, against a
 * fake Netflix and the fake TMDB. The history is synthetic, in Netflix's shape.
 */

const QUEUE = 'https://sqs.test/connection-sync';
const GUID = 'TESTPROFILEGUID0000000000A';
const DAY = 86_400_000;
const NOW = Date.now();

const JAR: ReadonlyArray<ConnectionCookie> = [
  {
    domain: '.netflix.com',
    expiresDate: null,
    httpOnly: true,
    name: 'NetflixId',
    path: '/',
    sameSite: 'lax',
    secure: true,
    value: 'session-value',
  },
];

type Entry = Readonly<Record<string, unknown>>;

const episode = (
  movieID: number,
  show: string,
  season: string,
  title: string,
  date: number,
): Entry => ({
  date,
  dateStr: 'redacted',
  episodeTitle: title,
  movieID,
  seasonDescriptor: season,
  series: movieID * 10,
  seriesTitle: show,
  title,
});

const film = (movieID: number, title: string, date: number): Entry => ({
  date,
  dateStr: 'redacted',
  movieID,
  title,
});

/** A history page, a refusal's status, or `torn`: a body cut off mid-read */
let pages: Array<ReadonlyArray<Entry> | number | 'torn'> = [];
let browseStatus = 200;
let browseSetCookie: string | null = null;
/** Set on every history page's answer (Netflix renewing a cookie mid-run) */
let pageSetCookie: string | null = null;
/** The cookie header each history page was asked with */
const pageCookies: Array<string | null> = [];
let browseLocation = '/gb/login?nextpage=%2Fbrowse';
/** Runs while the fake Netflix serves a history page (a Disconnect mid-run) */
let whileServing: (() => unknown) | null = null;
const netflixCalls: string[] = [];
/** Requests that went anywhere but Netflix or TMDB */
const elsewhere: Array<Readonly<{ cookie: string | null; host: string }>> = [];

/**
 * A failing answer: a status (with a `Retry-After`), a dropped connection,
 * a timeout, a body cut off mid-read, or a 200 that isn't JSON
 */
type Fault =
  | number
  | Readonly<{ status: number; retryAfter: string }>
  | 'reset'
  | 'timeout'
  | 'torn'
  | 'garbled';
/** Answered, one each, before `/browse` or a history page answers as itself */
let browseFaults: Fault[] = [];
let pageFaults: Fault[] = [];

const faultAnswer = (fault: Fault): Response => {
  if (typeof fault === 'number') {
    return new Response('busy', { status: fault });
  }
  if (typeof fault === 'object') {
    return new Response('busy', {
      headers: { 'retry-after': fault.retryAfter },
      status: fault.status,
    });
  }
  if (fault === 'reset') {
    throw new TypeError('fetch failed', {
      cause: Object.assign(new Error('read ECONNRESET'), {
        code: 'ECONNRESET',
      }),
    });
  }
  if (fault === 'timeout') {
    throw new DOMException('The operation timed out.', 'TimeoutError');
  }
  if (fault === 'garbled') {
    return new Response('{"jsonGraph":{"aui":', {
      headers: { 'content-type': 'application/json' },
    });
  }
  return new Response(
    new ReadableStream({
      start: (controller) => controller.error(new Error('timed out')),
    }),
  );
};

/** Episodes played only partway (their position short of the credits) */
let unfinished = new Set<number>();
let progressCalls = 0;

/** The positions behind Netflix's progress bars: finished unless listed */
const progressAnswer = (init?: RequestInit) => {
  progressCalls += 1;
  const path = JSON.parse(
    decodeURIComponent(String(init?.body).replace(/^path=/, '')),
  ) as [string, number[], string[]];
  const videos = Object.fromEntries(
    path[1].map((id) => [
      id,
      {
        bookmarkPosition: { value: unfinished.has(id) ? 600 : 2500 },
        creditsOffset: { value: 2400 },
        runtime: { value: 2600 },
      },
    ]),
  );
  return Response.json({ jsonGraph: { videos } });
};

const netflix = async (url: URL, init?: RequestInit): Promise<Response> => {
  if (url.pathname.startsWith('/nq/website/memberapi/')) {
    return progressAnswer(init);
  }
  netflixCalls.push(url.pathname);
  if (url.pathname === '/browse' && browseFaults.length > 0) {
    return faultAnswer(browseFaults.shift() as Fault);
  }
  if (url.pathname === '/browse') {
    const headers = new Headers({ 'content-type': 'text/html' });
    if (browseSetCookie) {
      headers.append('set-cookie', browseSetCookie);
    }
    if (browseStatus === 302) {
      headers.set('location', browseLocation);
    }
    return new Response(
      `<script>netflix = {"BUILD_IDENTIFIER":"v1","guid":"${GUID}"};</script>`,
      { headers, status: browseStatus },
    );
  }
  const callPath = JSON.parse(
    decodeURIComponent(url.searchParams.get('callPath') ?? '[]'),
  ) as [string, string, number];
  expect(String(init?.body)).toContain(GUID);
  pageCookies.push(new Headers(init?.headers).get('cookie'));
  await whileServing?.();
  const fault = pageFaults.shift();
  if (fault !== undefined) {
    return faultAnswer(fault);
  }
  const page = pages[callPath[2]] ?? [];
  if (typeof page === 'number') {
    return new Response('busy', { status: page });
  }
  if (page === 'torn') {
    return new Response(
      new ReadableStream({
        start: (controller) => controller.error(new Error('timed out')),
      }),
    );
  }
  return Response.json(
    {
      jsonGraph: {
        aui: {
          viewingActivity: {
            value: {
              profileInfo: { profileName: 'Profile' },
              vhSize: 99,
              viewedItems: page,
            },
          },
        },
      },
    },
    pageSetCookie ? { headers: { 'set-cookie': pageSetCookie } } : undefined,
  );
};

const seedConnection = async (extra: Record<string, unknown> = {}) => {
  await saveConnection({
    createdAt: NOW,
    lastSyncedAt: null,
    latestEpisodeTitle: null,
    latestTitle: null,
    latestWatchedAt: null,
    profileId: GUID,
    profileName: 'Profile',
    secret: await encryptSecret(USER_ID, 'netflix', JSON.stringify(JAR)),
    service: 'netflix',
    status: 'ok',
    total: 99,
    userAgent: null,
    userId: USER_ID,
    via: 'extension',
    ...extra,
  });
};

const syncNow = () =>
  request('/me/connections/netflix/sync', {
    as: USER_ID,
    method: 'POST',
  });

const queued = () =>
  sqsMessages
    .filter((message) => message.queueUrl === QUEUE)
    .map((message) => message.body as ConnectionSyncMessage);

const noPause = { pause: async () => {} };

const showOneEpisode = {
  episode: {
    airDate: '2020-01-01',
    episodeNumber: 1,
    runtime: 30,
    seasonNumber: 1,
    stillPath: null,
    title: 'Episode 1',
  },
  tvSeries: {
    id: 1,
    posterPath: '/1.jpg',
    slug: 'show-one',
    title: 'Show One',
  },
  watchedAt: NOW - DAY,
};

/** Runs the queued message to its end (continuations included) */
const runQueued = async () => {
  const [message] = queued();
  if (!message) {
    throw new Error('nothing queued');
  }
  return runSync(message, () => true, noPause);
};

const status = async () =>
  (await (
    await request('/me/connections/netflix', { as: USER_ID })
  ).json()) as Record<string, unknown> & {
    recent: Array<Record<string, unknown>>;
    sync: Record<string, unknown> | null;
    unresolvedCount: number;
    week: Array<Record<string, unknown>>;
  };

const watched = () =>
  db.dump('Watched') as Array<
    Readonly<{
      importId?: string;
      seriesId: number;
      seasonNumber: number;
      episodeNumber: number;
      watchedAt: number;
      watchProviderName?: string;
    }>
  >;

beforeEach(async () => {
  pages = [];
  browseFaults = [];
  pageFaults = [];
  browseStatus = 200;
  browseSetCookie = null;
  pageSetCookie = null;
  unfinished = new Set();
  progressCalls = 0;
  pageCookies.length = 0;
  browseLocation = '/gb/login?nextpage=%2Fbrowse';
  whileServing = null;
  netflixCalls.length = 0;
  elsewhere.length = 0;
  vi.stubGlobal(
    'fetch',
    (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.host === 'www.netflix.com') {
        return netflix(url, init);
      }
      if (url.host !== 'api.themoviedb.org') {
        elsewhere.push({
          cookie: new Headers(init?.headers).get('cookie'),
          host: url.host,
        });
        return new Response('<html></html>', { status: 200 });
      }
      return fakeFetch(input, init);
    },
  );
  fakeKms();
  // Admins may Sync now after the first sync too
  seedUser({ role: 'admin' });
  fakeShow({
    id: 1,
    name: 'Show One',
    seasons: [{ airDate: '2020-01-01', episodes: 3 }],
  });
  fakeShow({
    id: 2,
    name: 'Twin',
    seasons: [{ airDate: '2019-01-01', episodes: 2 }],
  });
  fakeShow({
    id: 3,
    name: 'Twin',
    seasons: [{ airDate: '2021-01-01', episodes: 2 }],
  });
  onTmdb(
    '/search/tv',
    { results: [{ id: 1, name: 'Show One', poster_path: '/1.jpg' }] },
    { query: { query: 'show one' } },
  );
  onTmdb(
    '/search/tv',
    {
      results: [
        { id: 2, name: 'Twin', poster_path: '/2.jpg' },
        { id: 3, name: 'Twin', poster_path: '/3.jpg' },
      ],
    },
    { query: { query: 'twin' } },
  );
  onTmdb('/search/tv', { results: [] }, { query: { query: 'nowhere' } });
});

describe('POST /me/connections/netflix/sync', () => {
  it('lets anyone run the first sync, and only admins after it', async () => {
    seedUser();
    await seedConnection();
    expect((await syncNow()).status).toBe(202);
    expect(queued()).toHaveLength(1);

    // Once a sync has finished, the nightly run is the viewer's
    const item = db
      .dump('Connections')
      .find((row) => row.sk === 'SERVICE#netflix');
    db.seed('Connections', [{ ...item, lastSyncedAt: NOW - 60_000 }]);
    expect((await syncNow()).status).toBe(403);
    expect(queued()).toHaveLength(1);
  });

  it('says 404 without a connection', async () => {
    expect((await syncNow()).status).toBe(404);
  });

  it('queues one run, and refuses a second while it is queued', async () => {
    await seedConnection();
    const first = await syncNow();
    expect(first.status).toBe(202);
    expect(queued()).toHaveLength(1);
    expect((await syncNow()).status).toBe(409);
    expect(queued()).toHaveLength(1);
    expect((await status()).sync).toMatchObject({ state: 'queued' });
  });

  it('carries on from the checkpoint of a run that went quiet', async () => {
    await seedConnection();
    await syncNow();
    const quiet = (await getConnection(USER_ID, 'netflix'))?.sync;
    db.seed('Connections', [
      {
        ...(db
          .dump('Connections')
          .find((item) => item.sk === 'SERVICE#netflix') ?? {}),
        sync: {
          ...quiet,
          heartbeatAt: NOW - 21 * 60_000,
          page: 3,
          state: 'running',
          written: 4,
        },
      },
    ]);
    expect((await syncNow()).status).toBe(202);
    expect(queued()).toHaveLength(2);
    const next = (await getConnection(USER_ID, 'netflix'))?.sync;
    expect(next).toMatchObject({ page: 3, state: 'queued', written: 4 });
    expect(next?.runId).not.toBe(quiet?.runId);

    // The quiet run's message, redelivered late, finds its claim gone
    const [late] = queued();
    expect(await runSync(late!, () => true, noPause)).toBe('stale');
    expect((await getConnection(USER_ID, 'netflix'))?.sync).toEqual(next);
  });

  it('tells the card when a run went quiet past the claim’s limit', async () => {
    await seedConnection();
    await syncNow();
    expect((await status()).sync).toMatchObject({
      stalled: false,
      state: 'queued',
    });
    const item = db
      .dump('Connections')
      .find((row) => row.sk === 'SERVICE#netflix');
    const queuedRun = (await getConnection(USER_ID, 'netflix'))?.sync;
    const quietFor = (minutes: number) =>
      db.seed('Connections', [
        {
          ...item,
          sync: {
            ...queuedRun,
            heartbeatAt: NOW - minutes * 60_000,
            state: 'running',
          },
        },
      ]);
    quietFor(10);
    expect((await status()).sync).toMatchObject({ stalled: false });
    quietFor(30);
    expect((await status()).sync).toMatchObject({
      stalled: true,
      state: 'running',
    });
  });
});

const syncFrom = (since: number | null) =>
  request('/me/connections/netflix/sync', {
    as: USER_ID,
    body: { since },
    method: 'POST',
  });

describe('How far back, on the first sync', () => {
  it('reads from the chosen day: that day in, the day before out', async () => {
    seedUser();
    await seedConnection();
    const since = NOW - 10 * DAY;
    pages = [
      [
        episode(101, 'Show One', 'Season 1', 'Episode 1', since),
        episode(102, 'Show One', 'Season 1', 'Episode 2', since - 1),
      ],
    ];
    expect((await syncFrom(since)).status).toBe(202);
    expect(await runQueued()).toBe('done');
    expect(watched().map((mark) => mark.episodeNumber)).toEqual([1]);
    expect((await status()).sync).toMatchObject({ since, state: 'ok' });
  });

  it('a chosen day that found nothing still ends there, not at the start of the history', async () => {
    seedUser();
    await seedConnection();
    const since = NOW - 10 * DAY;
    pages = [[episode(101, 'Show One', 'Season 1', 'Episode 1', since - DAY)]];
    await syncFrom(since);
    await runQueued();
    expect(watched()).toEqual([]);
    expect((await getConnection(USER_ID, 'netflix'))?.syncedThrough).toBe(
      since,
    );
  });

  it('Everything reads the whole history, even after a Disconnect kept a resume point', async () => {
    seedUser();
    await seedConnection();
    pages = [[episode(101, 'Show One', 'Season 1', 'Episode 1', NOW - DAY)]];
    await syncNow();
    await runQueued();
    await deleteConnection(USER_ID, 'netflix');
    await seedConnection();
    // The card offers where the last sync reached as the default
    expect((await status()).resumeFrom).toBe(NOW - DAY);

    pages = [
      [episode(102, 'Show One', 'Season 1', 'Episode 2', NOW - 300 * DAY)],
    ];
    sqsMessages.length = 0;
    await syncFrom(null);
    await runQueued();
    expect(
      watched()
        .map((mark) => mark.episodeNumber)
        .sort(),
    ).toEqual([1, 2]);
    expect((await status()).resumeFrom).toBeNull();
  });

  it('without a body, reads as it would by itself', async () => {
    seedUser();
    await seedConnection();
    const response = await request('/me/connections/netflix/sync', {
      as: USER_ID,
      method: 'POST',
    });
    expect(response.status).toBe(202);
    expect((await status()).sync).not.toHaveProperty('since');
  });

  it('refuses a day in the future, or a body that isn’t one', async () => {
    seedUser();
    await seedConnection();
    expect((await syncFrom(NOW + 2 * DAY)).status).toBe(400);
    expect(
      (
        await request('/me/connections/netflix/sync', {
          as: USER_ID,
          body: { since: 'yesterday' },
          method: 'POST',
        })
      ).status,
    ).toBe(400);
    expect(queued()).toHaveLength(0);
  });

  it('is the first sync’s alone: an admin’s later Sync now ignores it', async () => {
    await seedConnection();
    pages = [[episode(101, 'Show One', 'Season 1', 'Episode 1', NOW - DAY)]];
    await syncNow();
    await runQueued();
    expect((await syncFrom(NOW - 400 * DAY)).status).toBe(202);
    const run = (await getConnection(USER_ID, 'netflix'))?.sync;
    expect(run?.since).toBeUndefined();
    expect(run?.stopBefore).toBe(NOW - DAY - 2 * DAY);
  });
});

describe('a sync run', () => {
  it('writes matches as Netflix, counts films, keeps doubtful entries, and finishes', async () => {
    await seedConnection();
    pages = [
      [
        episode(101, 'Show One', 'Season 1', 'Episode 2', NOW - DAY),
        film(102, 'A Film', NOW - 2 * DAY),
      ],
      [
        episode(103, 'Twin', 'Season 1', 'Episode 1', NOW - 3 * DAY),
        episode(104, 'Nowhere', 'Season 1', 'Pilot', NOW - 4 * DAY),
      ],
    ];
    await syncNow();
    expect(await runQueued()).toBe('done');

    const [mark] = watched();
    expect(watched()).toHaveLength(1);
    expect(mark).toMatchObject({
      episodeNumber: 2,
      importId: expect.stringMatching(/^netflix-sync:[0-9a-f-]{36}$/),
      seasonNumber: 1,
      seriesId: 1,
      watchedAt: NOW - DAY,
      watchProviderName: 'Netflix',
    });

    const card = await status();
    expect(card.sync).toMatchObject({
      error: null,
      films: 1,
      state: 'ok',
      unresolved: 2,
      written: 1,
    });
    expect(card.lastSyncedAt).toEqual(expect.any(Number));
    expect(card.unresolvedCount).toBe(2);
    expect(card.recent).toEqual([
      expect.objectContaining({ episodeNumber: 2, seriesId: 1 }),
    ]);
    expect(card.week).toHaveLength(1);
    expect((await getConnection(USER_ID, 'netflix'))?.syncedThrough).toBe(
      NOW - DAY,
    );

    const list = (await (
      await request('/me/connections/netflix/unresolved', { as: USER_ID })
    ).json()) as { items: Array<Record<string, unknown>> };
    expect(list.items).toEqual([
      expect.objectContaining({
        candidates: [
          expect.objectContaining({ id: 2 }),
          expect.objectContaining({ id: 3 }),
        ],
        key: '103',
        kind: 'ambiguous',
        row: { episode: 'Episode 1', season: 'Season 1', title: 'Twin' },
      }),
      expect.objectContaining({ key: '104', kind: 'series-not-found' }),
    ]);
  });

  it('reads a country tag Netflix adds ("The Office (U.K.)") from TMDB’s origin country', async () => {
    for (const [id, country, airDate] of [
      [20, 'US', '2005-03-24'],
      [19, 'GB', '2001-07-09'],
    ] as const) {
      fakeShow({
        extra: { origin_country: [country] },
        id,
        name: 'The Office',
        seasons: [{ airDate, episodes: 6 }],
      });
    }
    const results = [20, 19].map((id) => ({
      first_air_date: id === 19 ? '2001-07-09' : '2005-03-24',
      id,
      name: 'The Office',
      origin_country: [id === 19 ? 'GB' : 'US'],
      poster_path: `/${id}.jpg`,
    }));
    for (const query of ['the office (uk)', 'the office']) {
      onTmdb('/search/tv', { results }, { query: { query } });
    }
    await seedConnection();
    pages = [
      [episode(105, 'The Office (U.K.)', 'Series 1', 'Episode 2', NOW - DAY)],
    ];
    await syncNow();
    expect(await runQueued()).toBe('done');
    expect(watched()).toEqual([
      expect.objectContaining({ episodeNumber: 2, seriesId: 19 }),
    ]);
  });

  it('keeps a Netflix CSV import out of the card’s activity', async () => {
    await seedConnection();
    await syncNow();
    expect(await runQueued()).toBe('done');
    await writeWatchedBatch(
      USER_ID,
      '00000000-0000-4000-8000-000000000000',
      [
        {
          episode: {
            airDate: '2020-01-15',
            episodeNumber: 3,
            runtime: 30,
            seasonNumber: 1,
            stillPath: null,
            title: 'Episode 3',
          },
          tvSeries: {
            id: 1,
            posterPath: '/1.jpg',
            slug: 'show-one',
            title: 'Show One',
          },
          watchedAt: NOW - DAY,
        },
      ],
      { watchProvider: NETFLIX_WATCH_PROVIDER },
    );
    expect(watched()).toHaveLength(1);
    expect((await status()).recent).toEqual([]);
  });

  it('keeps the date of an episode already marked on another date', async () => {
    const importId = '00000000-0000-4000-8000-000000000001';
    await writeWatchedBatch(USER_ID, importId, [
      {
        ...showOneEpisode,
        episode: { ...showOneEpisode.episode, episodeNumber: 2 },
        watchedAt: NOW - 10 * DAY,
      },
    ]);
    await seedConnection();
    pages = [[episode(101, 'Show One', 'Season 1', 'Episode 2', NOW - DAY)]];
    await syncNow();
    expect(await runQueued()).toBe('done');
    expect(watched()).toEqual([
      expect.objectContaining({
        episodeNumber: 2,
        importId,
        seasonNumber: 1,
        watchedAt: NOW - 10 * DAY,
      }),
    ]);
  });

  it('a later sync stops two days before the last synced date', async () => {
    await seedConnection();
    pages = [
      [episode(101, 'Show One', 'Season 1', 'Episode 1', NOW - 10 * DAY)],
    ];
    await syncNow();
    await runQueued();
    sqsMessages.length = 0;

    pages = [
      [
        episode(105, 'Show One', 'Season 1', 'Episode 3', NOW - DAY),
        episode(106, 'Show One', 'Season 1', 'Episode 2', NOW - 11 * DAY),
        episode(107, 'Show One', 'Season 1', 'Episode 2', NOW - 13 * DAY),
      ],
      [episode(108, 'Twin', 'Season 1', 'Episode 1', NOW - 20 * DAY)],
    ];
    await syncNow();
    expect(await runQueued()).toBe('done');
    // The overlap entry (11 days) is read, the one past it (13) is not,
    // and page 1 is never asked for
    expect(
      watched()
        .map((item) => item.episodeNumber)
        .sort(),
    ).toEqual([1, 2, 3]);
    expect((await status()).unresolvedCount).toBe(0);
  });

  it('marks the connection signed out when Netflix refuses the session', async () => {
    await seedConnection();
    browseStatus = 403;
    await syncNow();
    expect(await runQueued()).toBe('failed');
    const card = await status();
    expect(card.status).toBe('signed-out');
    expect(card.sync).toMatchObject({ error: 'signed-out', state: 'failed' });
  });

  it('reads a bounce to the sign-in page as signed out', async () => {
    await seedConnection();
    browseStatus = 302;
    await syncNow();
    expect(await runQueued()).toBe('failed');
    expect((await status()).status).toBe('signed-out');
  });

  it.each([
    'https://netflix.com.example.org/browse',
    'https://evilnetflix.com/browse',
    'http://www.netflix.com/browse',
  ])(
    'never follows a redirect off Netflix (%s): the page changed',
    async (location) => {
      await seedConnection();
      browseStatus = 302;
      browseLocation = location;
      await syncNow();
      expect(await runQueued()).toBe('failed');
      expect(elsewhere).toEqual([]);
      const card = await status();
      expect(card.status).toBe('ok');
      expect(card.sync).toMatchObject({ error: 'changed', state: 'failed' });
    },
  );

  it('reads a body cut off mid-read as a busy Netflix, not a changed page', async () => {
    await seedConnection();
    pages = ['torn'];
    await syncNow();
    expect(await runQueued()).toEqual({ later: 300 });
    expect((await getConnection(USER_ID, 'netflix'))?.sync).toMatchObject({
      error: null,
      strikes: 1,
    });
  });

  it('fails loudly, keeping its checkpoint, when the page changes shape', async () => {
    await seedConnection();
    pages = [
      [episode(101, 'Show One', 'Season 1', 'Episode 1', NOW - DAY)],
      [{ nothing: 'here' }],
    ];
    await syncNow();
    expect(await runQueued()).toBe('failed');
    expect(watched()).toHaveLength(1);
    expect((await getConnection(USER_ID, 'netflix'))?.sync).toMatchObject({
      error: 'changed',
      page: 1,
      state: 'failed',
    });
  });

  it('a new run after a failed one carries on from its checkpoint', async () => {
    await seedConnection();
    pages = [
      [episode(101, 'Show One', 'Season 1', 'Episode 1', NOW - DAY)],
      [{ nothing: 'here' }],
    ];
    await syncNow();
    expect(await runQueued()).toBe('failed');
    sqsMessages.length = 0;

    pages = [
      [{ nothing: 'here' }],
      [episode(102, 'Show One', 'Season 1', 'Episode 2', NOW - 2 * DAY)],
    ];
    await syncNow();
    // At the failed page, with the failed run's counts
    expect((await getConnection(USER_ID, 'netflix'))?.sync).toMatchObject({
      page: 1,
      state: 'queued',
      written: 1,
    });
    expect(await runQueued()).toBe('done');
    expect((await status()).sync).toMatchObject({ state: 'ok', written: 2 });
  });

  it('pauses on a busy Netflix, and fails on the third refusal in a row', async () => {
    await seedConnection();
    pages = [429];
    await syncNow();
    const event = {
      Records: [{ body: JSON.stringify(queued()[0]), messageId: 'm1' }],
    } as unknown as SQSEvent;
    sqsMessages.length = 0;

    await handler(event, lambdaContext(900_000));
    expect(sqsMessages).toEqual([
      expect.objectContaining({ delaySeconds: 300, queueUrl: QUEUE }),
    ]);
    await handler(event, lambdaContext(900_000));
    expect((await getConnection(USER_ID, 'netflix'))?.sync).toMatchObject({
      state: 'running',
      strikes: 2,
    });
    await handler(event, lambdaContext(900_000));
    expect((await status()).sync).toMatchObject({
      error: 'rate-limited',
      state: 'failed',
    });
    // The sync queue's only: a request may also queue a sampled metric
    expect(queued()).toHaveLength(2);
  });

  it('reads a page again later when TMDB fails, keeping no entry for review', async () => {
    await seedConnection();
    onTmdb(
      '/search/tv',
      { status_message: 'boom' },
      {
        query: { query: 'twin' },
        status: 500,
      },
    );
    pages = [[episode(103, 'Twin', 'Season 1', 'Episode 1', NOW - DAY)]];
    await syncNow();
    expect(await runQueued()).toEqual({ later: 300 });
    expect((await getConnection(USER_ID, 'netflix'))?.sync).toMatchObject({
      page: 0,
      strikes: 1,
    });
    expect((await status()).unresolvedCount).toBe(0);
  });

  it('counts a retried page once: its kept entries as unresolved, its writes as written', async () => {
    await seedConnection();
    onTmdb(
      '/search/tv',
      { status_message: 'boom' },
      { query: { query: 'broken' }, status: 500 },
    );
    pages = [
      [
        episode(103, 'Twin', 'Season 1', 'Episode 1', NOW - DAY),
        episode(109, 'Broken', 'Season 1', 'Pilot', NOW - 2 * DAY),
      ],
    ];
    await syncNow();
    const [message] = queued();
    // The first read keeps Twin for review, then TMDB fails
    expect(await runSync(message!, () => true, noPause)).toEqual({
      later: 300,
    });
    expect((await status()).unresolvedCount).toBe(1);
    // As if an earlier read of the page had written this episode
    await writeWatchedBatch(USER_ID, syncTag('netflix', message!.runId), [
      showOneEpisode,
    ]);

    onTmdb('/search/tv', { results: [] }, { query: { query: 'broken' } });
    pages = [
      [
        episode(101, 'Show One', 'Season 1', 'Episode 1', NOW - DAY),
        ...(pages[0] as ReadonlyArray<Entry>),
      ],
    ];
    expect(await runSync(message!, () => true, noPause)).toBe('done');
    expect((await status()).sync).toMatchObject({
      skipped: 0,
      unresolved: 2,
      written: 1,
    });
    expect((await status()).unresolvedCount).toBe(2);
  });

  it('a resumed run counts what the failed run did on its page as its own', async () => {
    await seedConnection();
    onTmdb(
      '/search/tv',
      { status_message: 'boom' },
      { query: { query: 'broken' }, status: 500 },
    );
    pages = [
      [
        episode(103, 'Twin', 'Season 1', 'Episode 1', NOW - DAY),
        episode(109, 'Broken', 'Season 1', 'Pilot', NOW - 2 * DAY),
      ],
    ];
    await syncNow();
    const [first] = queued();
    for (const outcome of [{ later: 300 }, { later: 300 }, 'failed']) {
      expect(await runSync(first!, () => true, noPause)).toEqual(outcome);
    }
    // As if the failed run had written this episode before it stopped
    await writeWatchedBatch(USER_ID, syncTag('netflix', first!.runId), [
      showOneEpisode,
    ]);

    onTmdb('/search/tv', { results: [] }, { query: { query: 'broken' } });
    pages = [
      [
        episode(101, 'Show One', 'Season 1', 'Episode 1', NOW - DAY),
        ...(pages[0] as ReadonlyArray<Entry>),
      ],
    ];
    sqsMessages.length = 0;
    await syncNow();
    expect(await runQueued()).toBe('done');
    expect((await status()).sync).toMatchObject({
      skipped: 0,
      unresolved: 2,
      written: 1,
    });
  });

  it('counts an episode watched twice in one run once as written, then as skipped', async () => {
    await seedConnection();
    pages = [
      [episode(101, 'Show One', 'Season 1', 'Episode 1', NOW - DAY)],
      [episode(101, 'Show One', 'Season 1', 'Episode 1', NOW - 5 * DAY)],
    ];
    await syncNow();
    expect(await runQueued()).toBe('done');
    expect((await status()).sync).toMatchObject({ skipped: 1, written: 1 });
  });

  it('continues in a new step when time runs out', async () => {
    await seedConnection();
    pages = [[episode(101, 'Show One', 'Season 1', 'Episode 1', NOW - DAY)]];
    await syncNow();
    const [message] = queued();
    let checks = 0;
    expect(await runSync(message!, () => checks++ < 1, noPause)).toBe(
      'continue',
    );
    expect((await getConnection(USER_ID, 'netflix'))?.sync).toMatchObject({
      page: 1,
      state: 'running',
    });
    expect(await runSync(message!, () => true, noPause)).toBe('done');
  });

  it('does nothing for a run that lost its claim (Disconnect, a newer run)', async () => {
    await seedConnection();
    pages = [[episode(101, 'Show One', 'Season 1', 'Episode 1', NOW - DAY)]];
    await syncNow();
    const [message] = queued();
    await request('/me/connections/netflix', { as: USER_ID, method: 'DELETE' });
    expect(await runSync(message!, () => true, noPause)).toBe('stale');
    expect(watched()).toEqual([]);
    expect(netflixCalls).toEqual([]);
    expect(await getConnection(USER_ID, 'netflix')).toBeNull();
  });

  it('keeps no review entry when Disconnect lands mid-run', async () => {
    await seedConnection();
    pages = [[episode(103, 'Twin', 'Season 1', 'Episode 1', NOW - DAY)]];
    await syncNow();
    whileServing = () =>
      request('/me/connections/netflix', { as: USER_ID, method: 'DELETE' });
    expect(await runQueued()).toBe('stale');
    // Only Disconnect's resume point: the run wrote nothing after it
    expect(
      db
        .dump('Connections')
        .filter((item) => item.pk === `USER#${USER_ID}`)
        .map((item) => item.sk),
    ).toEqual(['RESUME#netflix']);
  });

  it('stores the session as Netflix renewed it', async () => {
    await seedConnection();
    browseSetCookie =
      'NetflixId=renewed; Domain=.netflix.com; Path=/; Secure; HttpOnly';
    await syncNow();
    await runQueued();
    const stored = (await getConnection(USER_ID, 'netflix'))?.secret ?? '';
    const jar = cookiesFromSecret(
      await decryptSecret(USER_ID, 'netflix', stored),
    );
    expect(jar?.find((cookie) => cookie.name === 'NetflixId')?.value).toBe(
      'renewed',
    );
  });

  it('keeps a cookie Netflix renews on a history page, and sends it on the next', async () => {
    await seedConnection();
    pages = [
      [episode(101, 'Show One', 'Season 1', 'Episode 1', NOW - DAY)],
      [episode(102, 'Show One', 'Season 1', 'Episode 2', NOW - 2 * DAY)],
    ];
    pageSetCookie =
      'SecureNetflixId=fresh; Domain=.netflix.com; Path=/; Secure; HttpOnly';
    await syncNow();
    await runQueued();
    expect(pageCookies[0]).not.toContain('SecureNetflixId=fresh');
    expect(pageCookies[1]).toContain('SecureNetflixId=fresh');
    const stored = (await getConnection(USER_ID, 'netflix'))?.secret ?? '';
    const jar = cookiesFromSecret(
      await decryptSecret(USER_ID, 'netflix', stored),
    );
    expect(
      jar?.find((cookie) => cookie.name === 'SecureNetflixId')?.value,
    ).toBe('fresh');
  });
});

describe('a sync run against a failing Netflix', () => {
  const ONE = [episode(101, 'Show One', 'Season 1', 'Episode 1', NOW - DAY)];

  const pageCalls = () =>
    netflixCalls.filter((path) => path.includes('pathEvaluator')).length;

  /** One handler step of the queued run: what it queued next, if anything */
  const step = async () => {
    const event = {
      Records: [{ body: JSON.stringify(queued()[0]), messageId: 'm1' }],
    } as unknown as SQSEvent;
    sqsMessages.length = 0;
    await handler(event, lambdaContext(900_000));
    return sqsMessages.filter((message) => message.queueUrl === QUEUE);
  };

  const IN_PASSING: ReadonlyArray<readonly [string, Fault]> = [
    ['a timeout', 'timeout'],
    ['a connection reset', 'reset'],
    ['a body cut off mid-read', 'torn'],
    ['a 502', 502],
    ['a 503', 503],
    ['a 504', 504],
  ];

  it.each(IN_PASSING)(
    'asks a history page once more after %s, and reads on',
    async (_, fault) => {
      await seedConnection();
      pages = [ONE];
      pageFaults = [fault];
      await syncNow();
      expect(await runQueued()).toBe('done');
      expect(watched()).toHaveLength(1);
      expect((await status()).status).toBe('ok');
    },
  );

  it.each(IN_PASSING)(
    'asks /browse once more after %s, and reads on',
    async (_, fault) => {
      await seedConnection();
      pages = [ONE];
      browseFaults = [fault];
      await syncNow();
      expect(await runQueued()).toBe('done');
      expect(watched()).toHaveLength(1);
    },
  );

  it.each([
    ['timeouts', 'timeout'],
    ['resets', 'reset'],
    ['503s', 503],
  ] as const)(
    'strikes a page that fails twice (%s): tried again in five minutes, never signed out',
    async (_, fault) => {
      await seedConnection();
      pages = [ONE];
      pageFaults = [fault, fault];
      await syncNow();
      expect(await runQueued()).toEqual({ later: 300 });
      expect(pageCalls()).toBe(2);
      const card = await status();
      expect(card.status).toBe('ok');
      expect(card.sync).toMatchObject({ error: null, state: 'running' });
      expect((await getConnection(USER_ID, 'netflix'))?.sync).toMatchObject({
        page: 0,
        strikes: 1,
      });
    },
  );

  it.each([
    ['in seconds', '600', 600],
    ['too soon: a minute at least', '5', 60],
    ['past SQS’s longest delay: that delay', '3600', 900],
    [
      'as a date',
      new Date(Date.now() + 2 * 60 * 60_000).toUTCString(),
      // Clamped to an hour, then to SQS's longest delay
      900,
    ],
  ])(
    'waits as long as a 429 says to come back (%s)',
    async (_, retryAfter, delaySeconds) => {
      await seedConnection();
      pages = [ONE];
      pageFaults = [{ retryAfter, status: 429 }];
      await syncNow();
      expect(await step()).toEqual([expect.objectContaining({ delaySeconds })]);
      // A 429 is the service's word: not asked again in the same step
      expect(pageCalls()).toBe(1);
      expect((await status()).status).toBe('ok');
    },
  );

  it('takes a 503’s Retry-After as it is, without the quick retry', async () => {
    await seedConnection();
    pages = [ONE];
    pageFaults = [{ retryAfter: '120', status: 503 }];
    await syncNow();
    expect(await step()).toEqual([
      expect.objectContaining({ delaySeconds: 120 }),
    ]);
    expect(pageCalls()).toBe(1);
  });

  it('reads on in the next step after a Retry-After, its strikes cleared by the page', async () => {
    await seedConnection();
    pages = [ONE];
    pageFaults = [{ retryAfter: '60', status: 429 }];
    await syncNow();
    await step();
    expect(await step()).toEqual([]);
    expect((await status()).sync).toMatchObject({ state: 'ok', written: 1 });
  });

  it('fails a garbled page as changed, never signed out', async () => {
    await seedConnection();
    pages = [ONE];
    pageFaults = ['garbled'];
    await syncNow();
    expect(await runQueued()).toBe('failed');
    const card = await status();
    expect(card.status).toBe('ok');
    expect(card.sync).toMatchObject({ error: 'changed', state: 'failed' });
  });

  it('reads the good entries of a page with one malformed entry among them', async () => {
    await seedConnection();
    pages = [
      [
        ...ONE,
        { movieID: 'not a number', title: 7 },
        episode(102, 'Show One', 'Season 1', 'Episode 2', NOW - 2 * DAY),
      ],
    ];
    await syncNow();
    expect(await runQueued()).toBe('done');
    expect(watched()).toHaveLength(2);
    expect((await status()).sync).toMatchObject({ state: 'ok', written: 2 });
  });

  it.each([
    ['/browse refuses the session (401)', () => (browseStatus = 401)],
    ['a history page refuses it (403)', () => (pageFaults = [403])],
  ])('is signed out only on Netflix’s own word: %s', async (_, refuse) => {
    await seedConnection();
    pages = [ONE];
    refuse();
    await syncNow();
    expect(await runQueued()).toBe('failed');
    expect((await status()).status).toBe('signed-out');
  });
});

describe('the run’s end in the logs', () => {
  /** The JSON lines logged at `level` that end a run */
  const runEnds = (level: 'error' | 'log' | 'warn') =>
    spies[level].mock.calls
      .map(([line]: ReadonlyArray<unknown>) => line)
      .filter(
        (line: unknown): line is string =>
          typeof line === 'string' &&
          line.includes('"msg":"[NETFLIX SYNC] run'),
      )
      .map((line: string) => JSON.parse(line) as Record<string, unknown>);

  let spies: Record<'error' | 'log' | 'warn', ReturnType<typeof vi.spyOn>>;
  beforeEach(() => {
    spies = {
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    };
    return () => {
      for (const spy of Object.values(spies)) {
        spy.mockRestore();
      }
    };
  });

  it('logs one line for a finished run: what it did, how long it took', async () => {
    await seedConnection();
    pages = [
      [
        episode(101, 'Show One', 'Season 1', 'Episode 1', NOW - DAY),
        { movieID: 'not a number' },
        film(150, 'A Film', NOW - 2 * DAY),
        episode(103, 'Twin', 'Season 1', 'Episode 1', NOW - 3 * DAY),
      ],
    ];
    await syncNow();
    expect(await runQueued()).toBe('done');
    const [line, ...more] = runEnds('log');
    expect(more).toEqual([]);
    expect(line).toEqual({
      durationMs: expect.any(Number),
      films: 1,
      invalid: 1,
      msg: '[NETFLIX SYNC] run done',
      outcome: 'done',
      pages: 1,
      reason: null,
      runId: queued()[0]?.runId,
      service: 'netflix',
      skipped: 0,
      step: 'end',
      strikes: 0,
      unresolved: 1,
      unresolvedOverflow: 0,
      userId: USER_ID,
      written: 1,
    });
    // Nothing of the session in it
    expect(JSON.stringify(line)).not.toContain('session-value');
  });

  it('logs a changed service as an error, with where it changed', async () => {
    await seedConnection();
    pages = [
      [episode(101, 'Show One', 'Season 1', 'Episode 1', NOW - DAY)],
      [{ nothing: 'here' }],
    ];
    await syncNow();
    expect(await runQueued()).toBe('failed');
    expect(runEnds('error')).toEqual([
      expect.objectContaining({
        outcome: 'failed',
        reason: 'changed',
        service: 'netflix',
        step: 'page 1',
        written: 1,
      }),
    ]);
    expect(runEnds('log')).toEqual([]);
  });

  it('logs a signed-out session as a warning, at opening', async () => {
    await seedConnection();
    browseStatus = 403;
    await syncNow();
    expect(await runQueued()).toBe('failed');
    expect(runEnds('warn')).toEqual([
      expect.objectContaining({ reason: 'signed-out', step: 'open' }),
    ]);
  });

  it('logs nothing for a step that only waits or carries on', async () => {
    await seedConnection();
    pages = [[episode(101, 'Show One', 'Season 1', 'Episode 1', NOW - DAY)]];
    pageFaults = [429];
    await syncNow();
    expect(await runQueued()).toEqual({ later: 300 });
    expect([
      ...runEnds('log'),
      ...runEnds('warn'),
      ...runEnds('error'),
    ]).toEqual([]);
  });
});

describe('a played-but-unfinished episode', () => {
  it('is read past: never marked, kept for review or counted as a film', async () => {
    await seedConnection();
    pages = [
      [
        episode(101, 'Show One', 'Season 1', 'Episode 2', NOW - DAY),
        episode(102, 'Show One', 'Season 1', 'Episode 1', NOW - 2 * DAY),
      ],
    ];
    unfinished = new Set([101]);
    await syncNow();
    expect(await runQueued()).toBe('done');
    expect(watched().map((mark) => mark.episodeNumber)).toEqual([1]);
    expect((await status()).sync).toMatchObject({
      films: 0,
      unresolved: 0,
      written: 1,
    });
    // Still the newest read: the next sync starts after it
    expect((await getConnection(USER_ID, 'netflix'))?.syncedThrough).toBe(
      NOW - DAY,
    );
  });

  it('asks Netflix for the page’s positions once, for its episodes only', async () => {
    await seedConnection();
    pages = [
      [
        episode(101, 'Show One', 'Season 1', 'Episode 2', NOW - DAY),
        film(102, 'A Film', NOW - 2 * DAY),
      ],
    ];
    await syncNow();
    await runQueued();
    expect(progressCalls).toBe(1);
  });
});

describe('relinking', () => {
  it('keeps the sync position for the same profile, not for another', async () => {
    await seedConnection();
    pages = [[episode(101, 'Show One', 'Season 1', 'Episode 1', NOW - DAY)]];
    await syncNow();
    await runQueued();

    await seedConnection();
    expect((await getConnection(USER_ID, 'netflix'))?.syncedThrough).toBe(
      NOW - DAY,
    );
    await seedConnection({ profileId: 'ANOTHERPROFILEGUID' });
    expect(
      (await getConnection(USER_ID, 'netflix'))?.syncedThrough ?? null,
    ).toBeNull();
  });

  it('after Disconnect, the same profile carries on where it stopped; another starts over', async () => {
    await seedConnection();
    pages = [[episode(101, 'Show One', 'Season 1', 'Episode 1', NOW - DAY)]];
    await syncNow();
    await runQueued();
    await deleteConnection(USER_ID, 'netflix');

    await seedConnection();
    const again = await getConnection(USER_ID, 'netflix');
    expect(again?.syncedThrough).toBe(NOW - DAY);
    // A fresh link: Sync now is offered once, and reads only what's new
    expect(again?.lastSyncedAt).toBeNull();
    expect(
      db.dump('Connections').some((item) => item.sk === 'RESUME#netflix'),
    ).toBe(false);

    await deleteConnection(USER_ID, 'netflix');
    await seedConnection({ profileId: 'ANOTHERPROFILEGUID' });
    expect(
      (await getConnection(USER_ID, 'netflix'))?.syncedThrough ?? null,
    ).toBeNull();
  });
});

describe('the review list', () => {
  const seedReview = async () => {
    await seedConnection();
    pages = [
      [
        episode(103, 'Twin', 'Season 1', 'Episode 1', NOW - DAY),
        episode(104, 'Nowhere', 'Season 1', 'Pilot', NOW - 2 * DAY),
      ],
    ];
    await syncNow();
    await runQueued();
    sqsMessages.length = 0;
  };

  const resolveBody = {
    items: [
      {
        episode: {
          airDate: '2019-01-01',
          episodeNumber: 1,
          runtime: 30,
          seasonNumber: 1,
          stillPath: null,
          title: 'Episode 1',
        },
        tvSeries: { id: 3, posterPath: '/3.jpg', slug: 'twin', title: 'Twin' },
        watchedAt: NOW - DAY,
      },
    ],
    keys: ['103'],
  };

  it('resolves: writes the pick as Netflix and the entry never comes back', async () => {
    await seedReview();
    const response = await request(
      '/me/connections/netflix/unresolved/resolve',
      { as: USER_ID, body: resolveBody, method: 'POST' },
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      closed: 1,
      skipped: 0,
      written: 1,
    });
    expect(watched()).toEqual([
      expect.objectContaining({
        importId: expect.stringMatching(/^netflix-sync:/),
        seriesId: 3,
        watchProviderName: 'Netflix',
      }),
    ]);
    expect((await status()).unresolvedCount).toBe(1);

    // The overlap of the next sync reads the entry again: it stays closed
    await syncNow();
    await runQueued();
    expect((await status()).unresolvedCount).toBe(1);
  });

  it('closes nothing once the connection is gone (a Disconnect under way)', async () => {
    await seedReview();
    db.table('Connections').delete({
      pk: `USER#${USER_ID}`,
      sk: 'SERVICE#netflix',
    });
    const before = db.dump('Connections');
    const response = await request(
      '/me/connections/netflix/unresolved/dismiss',
      { as: USER_ID, body: { keys: ['103', '104'] }, method: 'POST' },
    );
    await expect(response.json()).resolves.toEqual({ closed: 0 });
    expect(db.dump('Connections')).toEqual(before);
  });

  it('dismisses for good, and refuses keys that are not ids', async () => {
    await seedReview();
    const bad = await request('/me/connections/netflix/unresolved/dismiss', {
      as: USER_ID,
      body: { keys: ['SERVICE#netflix'] },
      method: 'POST',
    });
    expect(bad.status).toBe(400);
    const response = await request(
      '/me/connections/netflix/unresolved/dismiss',
      { as: USER_ID, body: { keys: ['104', '104', '999'] }, method: 'POST' },
    );
    await expect(response.json()).resolves.toEqual({ closed: 1 });
    const list = (await (
      await request('/me/connections/netflix/unresolved', { as: USER_ID })
    ).json()) as { items: Array<{ key: string }> };
    expect(list.items.map((item) => item.key)).toEqual(['103']);
  });

  it('skips every open entry at once, loaded or not, for good', async () => {
    await seedReview();
    const response = await request(
      '/me/connections/netflix/unresolved/dismiss-all',
      { as: USER_ID, method: 'POST' },
    );
    await expect(response.json()).resolves.toEqual({ closed: 2 });
    expect((await status()).unresolvedCount).toBe(0);
    const list = (await (
      await request('/me/connections/netflix/unresolved', { as: USER_ID })
    ).json()) as { items: unknown[] };
    expect(list.items).toEqual([]);
  });

  it('skips one group’s entries only when it is named', async () => {
    await seedReview();
    const response = await request(
      '/me/connections/netflix/unresolved/dismiss-all?group=not-found',
      { as: USER_ID, method: 'POST' },
    );
    await expect(response.json()).resolves.toEqual({ closed: 1 });
    const list = (await (
      await request('/me/connections/netflix/unresolved', { as: USER_ID })
    ).json()) as { items: Array<{ key: string; kind: string }> };
    expect(list.items).toEqual([
      expect.objectContaining({ key: '103', kind: 'ambiguous' }),
    ]);
    expect((await status()).unresolvedCount).toBe(1);
    const bad = await request(
      '/me/connections/netflix/unresolved/dismiss-all?group=everything',
      { as: USER_ID, method: 'POST' },
    );
    expect(bad.status).toBe(400);
  });

  it('skips nothing once the connection is gone (a Disconnect under way)', async () => {
    await seedReview();
    db.table('Connections').delete({
      pk: `USER#${USER_ID}`,
      sk: 'SERVICE#netflix',
    });
    const before = db.dump('Connections');
    const response = await request(
      '/me/connections/netflix/unresolved/dismiss-all',
      { as: USER_ID, method: 'POST' },
    );
    await expect(response.json()).resolves.toEqual({ closed: 0 });
    expect(db.dump('Connections')).toEqual(before);
  });

  describe('Skip all over a long list', () => {
    /** `n` open entries, as a sync kept them, and their count */
    const seedMany = async (n: number) => {
      await seedConnection();
      db.seed('Connections', [
        ...Array.from({ length: n }, (_, index) => ({
          chainId: 'a-chain',
          createdAt: NOW,
          kind: index % 2 ? 'ambiguous' : 'series-not-found',
          pk: `USER#${USER_ID}`,
          row: { episode: '1', season: '1', title: 'Nowhere' },
          sk: `UNRESOLVED#netflix#${1000 + index}`,
          watchedAt: NOW - DAY,
        })),
        { open: n, pk: `USER#${USER_ID}`, sk: 'UNRESOLVEDCOUNT#netflix' },
      ]);
    };
    const skipAll = async (query = '') =>
      (await (
        await request(
          `/me/connections/netflix/unresolved/dismiss-all${query}`,
          { as: USER_ID, method: 'POST' },
        )
      ).json()) as { closed: number };
    const openKeys = () =>
      db
        .dump('Connections')
        .map((item) => String(item.sk))
        .filter((sk) => sk.startsWith('UNRESOLVED#'));
    const closedKeys = () =>
      db
        .dump('Connections')
        .map((item) => String(item.sk))
        .filter((sk) => sk.startsWith('CLOSED#'));

    /** Runs `act` once, just before the `nth` transaction (from 1) goes out */
    const beforeTransaction = (nth: number, act: () => void) => {
      const send = db.send.bind(db);
      let seen = 0;
      const spy = vi.spyOn(db, 'send').mockImplementation(async (command) => {
        if (command instanceof TransactWriteItemsCommand) {
          seen += 1;
          if (seen === nth) {
            act();
          }
        }
        return send(command);
      });
      onTestFinished(() => spy.mockRestore());
    };

    it('closes every entry, transaction after transaction, the count moving with them', async () => {
      await seedMany(70);
      expect(await skipAll()).toEqual({ closed: 70 });
      expect(openKeys()).toEqual([]);
      expect(closedKeys()).toHaveLength(70);
      expect((await status()).unresolvedCount).toBe(0);
    });

    it('closes only the named group across transactions', async () => {
      await seedMany(70);
      expect(await skipAll('?group=ambiguous')).toEqual({ closed: 35 });
      expect(openKeys()).toHaveLength(35);
      expect((await status()).unresolvedCount).toBe(35);
    });

    it('stops once the connection is gone midway, every closed entry counted', async () => {
      await seedMany(70);
      beforeTransaction(2, () =>
        db.table('Connections').delete({
          pk: `USER#${USER_ID}`,
          sk: 'SERVICE#netflix',
        }),
      );
      const { closed } = await skipAll();
      expect(closed).toBeGreaterThan(0);
      expect(closed).toBeLessThan(70);
      expect(closedKeys()).toHaveLength(closed);
      expect(openKeys()).toHaveLength(70 - closed);
      const count = db
        .table('Connections')
        .get({ pk: `USER#${USER_ID}`, sk: 'UNRESOLVEDCOUNT#netflix' });
      expect(count?.open).toBe(70 - closed);
    });

    it('passes over an entry closed meanwhile, counting only what it closed', async () => {
      await seedMany(10);
      beforeTransaction(1, () => {
        // A resolve landing first: the entry moves to its marker, the count drops
        db.table('Connections').delete({
          pk: `USER#${USER_ID}`,
          sk: 'UNRESOLVED#netflix#1003',
        });
        db.seed('Connections', [
          {
            pk: `USER#${USER_ID}`,
            resolvedAt: NOW,
            sk: 'CLOSED#netflix#1003',
          },
          { open: 9, pk: `USER#${USER_ID}`, sk: 'UNRESOLVEDCOUNT#netflix' },
        ]);
      });
      expect(await skipAll()).toEqual({ closed: 9 });
      expect(openKeys()).toEqual([]);
      expect((await status()).unresolvedCount).toBe(0);
    });
  });

  it('leaves a marker for every entry Skip all closed', async () => {
    await seedReview();
    await request('/me/connections/netflix/unresolved/dismiss-all', {
      as: USER_ID,
      method: 'POST',
    });
    const closed = db
      .dump('Connections')
      .map((item) => String(item.sk))
      .filter((sk) => sk.startsWith('CLOSED#netflix#'))
      .sort();
    expect(closed).toEqual(['CLOSED#netflix#103', 'CLOSED#netflix#104']);
  });

  it('moves a closed entry off the open list onto its own marker', async () => {
    await seedReview();
    await request('/me/connections/netflix/unresolved/dismiss', {
      as: USER_ID,
      body: { keys: ['104'] },
      method: 'POST',
    });
    const keys = db
      .dump('Connections')
      .map((item) => String(item.sk))
      .filter((sk) => sk.endsWith('#104'));
    expect(keys).toEqual(['CLOSED#netflix#104']);
    expect((await status()).unresolvedCount).toBe(1);

    // The overlap of the next sync reads it again: it stays closed
    await syncNow();
    await runQueued();
    expect((await status()).unresolvedCount).toBe(1);
  });

  it('ends a list of exactly one page without a cursor', async () => {
    await seedConnection();
    pages = [
      Array.from({ length: 50 }, (_, index) =>
        episode(1000 + index, 'Nowhere', 'Season 1', 'Pilot', NOW - index),
      ),
    ];
    await syncNow();
    await runQueued();
    const first = (await (
      await request('/me/connections/netflix/unresolved', { as: USER_ID })
    ).json()) as { items: unknown[]; nextCursor: string | null };
    expect(first.items).toHaveLength(50);
    expect(first.nextCursor).toBeNull();
  });

  it('pages by cursor, 50 open entries a page', async () => {
    await seedConnection();
    pages = [
      Array.from({ length: 60 }, (_, index) =>
        episode(1000 + index, 'Nowhere', 'Season 1', 'Pilot', NOW - index),
      ),
    ];
    await syncNow();
    await runQueued();
    const first = (await (
      await request('/me/connections/netflix/unresolved', { as: USER_ID })
    ).json()) as { items: unknown[]; nextCursor: string | null };
    expect(first.items).toHaveLength(50);
    expect(first.nextCursor).toBe('1049');
    const second = (await (
      await request(
        `/me/connections/netflix/unresolved?cursor=${first.nextCursor}`,
        { as: USER_ID },
      )
    ).json()) as { items: unknown[]; nextCursor: string | null };
    expect(second.items).toHaveLength(10);
    expect(second.nextCursor).toBeNull();
  });

  it('only counts entries past the cap', async () => {
    await seedConnection();
    db.seed('Connections', [
      { open: MAX_OPEN, pk: `USER#${USER_ID}`, sk: 'UNRESOLVEDCOUNT#netflix' },
    ]);
    pages = [[episode(104, 'Nowhere', 'Season 1', 'Pilot', NOW - DAY)]];
    await syncNow();
    await runQueued();
    expect((await status()).sync).toMatchObject({
      unresolved: 0,
      unresolvedOverflow: 1,
    });
    const list = (await (
      await request('/me/connections/netflix/unresolved', { as: USER_ID })
    ).json()) as { items: unknown[] };
    expect(list.items).toEqual([]);
  });
});

describe('re-checking the review list', () => {
  /** Open entries an earlier sync kept, under an older matcher */
  const seedOpen = (
    entries: ReadonlyArray<
      Readonly<{
        key: string;
        row: Readonly<{ episode: string; season: string; title: string }>;
      }>
    >,
  ) =>
    db.seed('Connections', [
      ...entries.map(({ key, row }, index) => ({
        chainId: 'an-earlier-chain',
        createdAt: NOW - 30 * DAY,
        kind: 'series-not-found',
        pk: `USER#${USER_ID}`,
        row,
        sk: `UNRESOLVED#netflix#${key}`,
        watchedAt: NOW - (10 + index) * DAY,
      })),
      {
        open: entries.length,
        pk: `USER#${USER_ID}`,
        sk: 'UNRESOLVEDCOUNT#netflix',
      },
    ]);

  const sks = () =>
    db
      .dump('Connections')
      .map((item) => String(item.sk))
      .filter((sk) => /^(UNRESOLVED|CLOSED)#/.test(sk))
      .sort();

  it('writes the open entries that match now, closes them, and keeps the rest', async () => {
    await seedConnection();
    seedOpen([
      {
        key: '201',
        row: { episode: 'Episode 3', season: 'Season 1', title: 'Show One' },
      },
      {
        key: '202',
        row: { episode: 'Pilot', season: 'Season 1', title: 'Nowhere' },
      },
      // Kept before nameless entries were counted with the films
      { key: '203', row: { episode: 'Episode 3', season: '', title: '' } },
    ]);
    await syncNow();
    expect(await runQueued()).toBe('done');

    expect(watched()).toEqual([
      expect.objectContaining({
        episodeNumber: 3,
        importId: syncTag(
          'netflix',
          String((await getConnection(USER_ID, 'netflix'))?.sync?.chainId),
        ),
        seriesId: 1,
        watchedAt: NOW - 10 * DAY,
        watchProviderName: 'Netflix',
      }),
    ]);
    expect(sks()).toEqual([
      'CLOSED#netflix#201',
      'CLOSED#netflix#203',
      'UNRESOLVED#netflix#202',
    ]);
    const closed = db
      .dump('Connections')
      .filter((item) => String(item.sk).startsWith('CLOSED#'));
    expect(closed).toEqual([
      expect.objectContaining({ resolvedAt: expect.any(Number) }),
      expect.objectContaining({ dismissedAt: expect.any(Number) }),
    ]);
    const card = await status();
    expect(card.unresolvedCount).toBe(1);
    expect(card.sync).toMatchObject({ state: 'ok', unresolved: 0, written: 1 });
  });

  it('leaves the entries this run kept alone: today’s matcher read them', async () => {
    await seedConnection();
    pages = [[episode(104, 'Nowhere', 'Season 1', 'Pilot', NOW - DAY)]];
    await syncNow();
    const search = vi.fn();
    expect(
      await runSync(queued()[0]!, () => true, {
        ...noPause,
        catalog: {
          getSeason: async () => undefined,
          getTvSeries: async () => undefined,
          searchTvSeries: async (title) => {
            search(title);
            return [];
          },
        },
      }),
    ).toBe('done');
    expect(search).toHaveBeenCalledTimes(1);
    expect(sks()).toEqual(['UNRESOLVED#netflix#104']);
  });

  it('carries on from where it stopped when time runs out', async () => {
    await seedConnection();
    seedOpen(
      Array.from({ length: 30 }, (_, index) => ({
        key: String(300 + index),
        row: {
          episode: `Episode ${(index % 3) + 1}`,
          season: 'Season 1',
          title: 'Show One',
        },
      })),
    );
    await syncNow();
    let calls = 0;
    // One history read, one page of the review list, then out of time
    expect(await runSync(queued()[0]!, () => calls++ < 2, noPause)).toBe(
      'continue',
    );
    const open = () => sks().filter((sk) => sk.startsWith('UNRESOLVED#'));
    expect(open().length).toBeGreaterThan(0);
    expect(open().length).toBeLessThan(30);
    expect((await getConnection(USER_ID, 'netflix'))?.sync).toMatchObject({
      state: 'running',
    });

    netflixCalls.length = 0;
    expect(await runSync(queued()[0]!, () => true, noPause)).toBe('done');
    // The history was read to its end already: Netflix isn't asked again
    expect(netflixCalls).toEqual([]);
    expect(open()).toEqual([]);
    expect((await status()).unresolvedCount).toBe(0);
  });

  it('re-checks only once per matcher: not again until its rules change', async () => {
    const matchable = {
      key: '201',
      row: { episode: 'Episode 3', season: 'Season 1', title: 'Show One' },
    };
    await seedConnection();
    seedOpen([
      { key: '202', row: { episode: 'Pilot', season: '1', title: 'Nowhere' } },
    ]);
    await syncNow();
    expect(await runQueued()).toBe('done');
    expect((await getConnection(USER_ID, 'netflix'))?.recheckedWith).toBe(
      MATCHER_VERSION,
    );

    // Kept under an older matcher, but this one re-checked the list already
    seedOpen([matchable]);
    await syncNow();
    expect(await runSync(queued().at(-1)!, () => true, noPause)).toBe('done');
    expect(sks()).toContain('UNRESOLVED#netflix#201');
    expect(watched()).toEqual([]);
  });

  it('re-checks again once the matcher changed', async () => {
    await seedConnection({ recheckedWith: MATCHER_VERSION - 1 });
    seedOpen([
      {
        key: '201',
        row: { episode: 'Episode 3', season: 'Season 1', title: 'Show One' },
      },
    ]);
    await syncNow();
    expect(await runQueued()).toBe('done');
    expect(sks()).toEqual(['CLOSED#netflix#201']);
    expect((await getConnection(USER_ID, 'netflix'))?.recheckedWith).toBe(
      MATCHER_VERSION,
    );
  });

  it('keeps the re-check’s matcher across a relink', async () => {
    await seedConnection({ recheckedWith: MATCHER_VERSION });
    await seedConnection();
    expect((await getConnection(USER_ID, 'netflix'))?.recheckedWith).toBe(
      MATCHER_VERSION,
    );
  });

  it('reads the review list again later when TMDB fails, closing nothing', async () => {
    await seedConnection();
    seedOpen([
      {
        key: '201',
        row: { episode: 'Episode 3', season: 'Season 1', title: 'Show One' },
      },
    ]);
    await syncNow();
    expect(
      await runSync(queued()[0]!, () => true, {
        ...noPause,
        catalog: {
          getSeason: async () => undefined,
          getTvSeries: async () => undefined,
          searchTvSeries: async () => {
            throw new Error('TMDB down');
          },
        },
      }),
    ).toEqual({ later: 300 });
    expect(sks()).toEqual(['UNRESOLVED#netflix#201']);
    expect(await runSync(queued()[0]!, () => true, noPause)).toBe('done');
    expect(sks()).toEqual(['CLOSED#netflix#201']);
  });
});

describe('a sync through any reader', () => {
  const row = (
    title: string,
    episode: string,
    watchedAt: number,
    index = 0,
  ) => ({
    episode,
    index,
    season: 'Season 1',
    title,
    watchedAt,
  });
  const PROVIDER = { id: 99, logo: '', logoPath: '/x.jpg', name: 'Elsewhere' };

  /** A reader for a service the loop knows nothing about */
  const fakeReader = (
    history: ReadonlyArray<ReadonlyArray<HistoryEntry>>,
    opened: string[],
  ): ServiceReader => ({
    label: 'FAKE SYNC',
    link: async () => ({ ok: false, reason: 'read-failed' }),
    open: async (secret, profileId) => {
      opened.push(`${secret}|${profileId}`);
      return {
        ok: true,
        session: {
          readPage: async (page) => ({
            ok: true,
            page: { entries: history[page] ?? [], invalid: 0 },
          }),
          secret,
        },
      };
    },
    watchProvider: PROVIDER,
  });

  it('opens the plaintext session, writes as the reader’s provider, counts entries without a row, keeps its keys', async () => {
    await seedConnection();
    const opened: string[] = [];
    const reader = fakeReader(
      [
        [
          {
            key: 'p0abc1',
            row: row('Show One', 'Episode 3', NOW - DAY),
            watchedAt: NOW - DAY,
          },
          { key: 'p0abc2', row: null, watchedAt: NOW - 2 * DAY },
          {
            key: 'p0abc3',
            row: row('Nowhere', 'Pilot', NOW - 3 * DAY, 2),
            watchedAt: NOW - 3 * DAY,
          },
        ],
      ],
      opened,
    );
    await syncNow();
    const [message] = queued();
    expect(
      await runSync(message!, () => true, {
        ...noPause,
        readerOf: () => reader,
      }),
    ).toBe('done');

    expect(opened).toEqual([`${JSON.stringify(JAR)}|${GUID}`]);
    expect(netflixCalls).toEqual([]);
    expect(watched()).toEqual([
      expect.objectContaining({
        episodeNumber: 3,
        importId: expect.stringMatching(/^netflix-sync:/),
        seriesId: 1,
        watchProviderName: 'Elsewhere',
      }),
    ]);
    expect((await status()).sync).toMatchObject({
      films: 1,
      state: 'ok',
      unresolved: 1,
      written: 1,
    });
    const list = (await (
      await request('/me/connections/netflix/unresolved', { as: USER_ID })
    ).json()) as { items: Array<Record<string, unknown>> };
    expect(list.items).toEqual([
      expect.objectContaining({ key: 'p0abc3', kind: 'series-not-found' }),
    ]);
  });

  it('stores a session the service renewed while reading a page (Prime Video renews on every read)', async () => {
    await seedConnection();
    let secret = JSON.stringify(JAR);
    const reader: ServiceReader = {
      ...fakeReader([], []),
      open: async () => ({
        ok: true,
        session: {
          readPage: async () => {
            secret = JSON.stringify([{ ...JAR[0]!, value: 'renewed' }]);
            return { ok: true, page: { entries: [], invalid: 0 } };
          },
          get secret() {
            return secret;
          },
        },
      }),
    };
    await syncNow();
    const [message] = queued();
    expect(
      await runSync(message!, () => true, {
        ...noPause,
        readerOf: () => reader,
      }),
    ).toBe('done');
    const stored = await getConnection(USER_ID, 'netflix');
    expect(await decryptSecret(USER_ID, 'netflix', stored!.secret)).toBe(
      secret,
    );
  });

  it('asks KMS once a run, however often the service renews the session', async () => {
    await seedConnection();
    let secret = JSON.stringify(JAR);
    let reads = 0;
    const reader: ServiceReader = {
      ...fakeReader([], []),
      open: async () => ({
        ok: true,
        session: {
          readPage: async () => {
            reads += 1;
            secret = JSON.stringify([
              { ...JAR[0]!, value: `renewed-${reads}` },
            ]);
            return {
              ok: true,
              page: { entries: [], invalid: 0, more: reads < 3 },
            };
          },
          get secret() {
            return secret;
          },
        },
      }),
    };
    await syncNow();
    const [message] = queued();
    const send = vi.mocked(KMSClient.prototype.send);
    send.mockClear();
    expect(
      await runSync(message!, () => true, {
        ...noPause,
        readerOf: () => reader,
      }),
    ).toBe('done');
    const calls = send.mock.calls.map(([command]) => command.constructor.name);
    expect(reads).toBe(3);
    // One unwrap of the stored key; every renewal is sealed with it
    expect(calls).toEqual(['DecryptCommand']);
    const stored = await getConnection(USER_ID, 'netflix');
    expect(await decryptSecret(USER_ID, 'netflix', stored!.secret)).toBe(
      secret,
    );
  });

  describe('a history paged by cursor (Prime Video)', () => {
    const entry = (n: number): HistoryEntry => ({
      key: `p0c${n}`,
      row: null,
      watchedAt: NOW - n * DAY,
    });
    /** Three pages; each hands back the next one's cursor */
    const cursorReader = (
      asked: Array<Readonly<{ from: unknown; page: number }>>,
      walkOnce = false,
    ): ServiceReader => {
      let walked = !walkOnce;
      return {
        ...fakeReader([], []),
        open: async () => ({
          ok: true,
          session: {
            readPage: async (page, options) => {
              asked.push({ from: options?.from, page });
              if (!walked) {
                walked = true;
                return { ok: true, walking: { page: 1, token: 'walked-1' } };
              }
              return {
                next:
                  page < 2 ? { page: page + 1, token: `t${page + 1}` } : null,
                ok: true,
                page: { entries: page < 3 ? [entry(page)] : [], invalid: 0 },
              };
            },
            secret: JSON.stringify(JAR),
          },
        }),
      };
    };

    it('checkpoints the next page’s cursor, and a later step reads on from it', async () => {
      await seedConnection();
      await syncNow();
      const asked: Array<Readonly<{ from: unknown; page: number }>> = [];
      const reader = cursorReader(asked);
      let reads = 0;
      expect(
        await runSync(queued()[0]!, () => reads++ < 1, {
          ...noPause,
          readerOf: () => reader,
        }),
      ).toBe('continue');
      expect((await getConnection(USER_ID, 'netflix'))?.sync).toMatchObject({
        cursor: { page: 1, token: 't1' },
        page: 1,
      });

      expect(
        await runSync(queued()[0]!, () => true, {
          ...noPause,
          readerOf: () => reader,
        }),
      ).toBe('done');
      expect(asked).toEqual([
        { from: undefined, page: 0 },
        { from: { page: 1, token: 't1' }, page: 1 },
        { from: { page: 2, token: 't2' }, page: 2 },
        { from: null, page: 3 },
      ]);
    });

    it('keeps how far a walk got when the step runs out of time, and carries on from there', async () => {
      await seedConnection();
      await syncNow();
      const asked: Array<Readonly<{ from: unknown; page: number }>> = [];
      const reader = cursorReader(asked, true);
      expect(
        await runSync(queued()[0]!, () => true, {
          ...noPause,
          readerOf: () => reader,
        }),
      ).toBe('continue');
      expect((await getConnection(USER_ID, 'netflix'))?.sync).toMatchObject({
        cursor: { page: 1, token: 'walked-1' },
        page: 0,
      });
      expect(
        await runSync(queued()[0]!, () => true, {
          ...noPause,
          readerOf: () => reader,
        }),
      ).toBe('done');
      expect(asked[1]).toEqual({
        from: { page: 1, token: 'walked-1' },
        page: 0,
      });
    });

    it('a run that resumes a failed one starts from its cursor', async () => {
      await seedConnection();
      await syncNow();
      const asked: Array<Readonly<{ from: unknown; page: number }>> = [];
      const reader = cursorReader(asked);
      let reads = 0;
      await runSync(queued()[0]!, () => reads++ < 1, {
        ...noPause,
        readerOf: () => reader,
      });
      const key = { pk: `USER#${USER_ID}`, sk: 'SERVICE#netflix' };
      const item = db.table('Connections').get(key)!;
      db.table('Connections').put({
        ...item,
        sync: { ...(item.sync as object), state: 'failed' },
      });
      await syncNow();
      expect((await getConnection(USER_ID, 'netflix'))?.sync).toMatchObject({
        cursor: { page: 1, token: 't1' },
        page: 1,
        state: 'queued',
      });
    });
  });

  it('dated by each play (iPlayer), a later sync writes the new ones, keeps the first date of a rewatch, and stops at the cut-off', async () => {
    await seedConnection();
    type Play = Readonly<{ at: number; episode: string; key: string }>;
    // Pages as iPlayer's: a page of plays not yet watched has no entries
    // but more after it
    let history: ReadonlyArray<ReadonlyArray<Play>> = [
      [{ at: NOW - 10 * DAY, episode: 'Episode 1', key: 'm001a' }],
      [],
      [{ at: NOW - 40 * DAY, episode: 'Episode 3', key: 'm001c' }],
    ];
    const read: number[] = [];
    const reader: ServiceReader = {
      ...fakeReader([], []),
      open: async (secret) => ({
        ok: true,
        session: {
          readPage: async (page) => {
            read.push(page);
            const plays = history[page];
            return {
              ok: true,
              page: plays
                ? {
                    entries: plays.map(({ at, episode, key }, index) => ({
                      key,
                      row: row('Show One', episode, at, index),
                      watchedAt: at,
                    })),
                    invalid: 0,
                    more: true,
                  }
                : { entries: [], invalid: 0 },
            };
          },
          secret,
        },
      }),
    };
    const run = async () => {
      await syncNow();
      const message = queued().at(-1);
      return runSync(message!, () => true, {
        ...noPause,
        readerOf: () => reader,
      });
    };

    expect(await run()).toBe('done');
    // On past the page with nothing watched, to the page past the last
    expect(read).toEqual([0, 1, 2, 3]);
    expect(
      watched()
        .map((item) => item.episodeNumber)
        .sort(),
    ).toEqual([1, 3]);

    read.length = 0;
    history = [
      [
        // Watched again: the row moves to the top with a later date
        { at: NOW - DAY / 24, episode: 'Episode 1', key: 'm001a' },
        // Paused before the last sync, finished since
        { at: NOW - DAY, episode: 'Episode 2', key: 'm001b' },
      ],
      [],
      // Past the cut-off (two days before the last synced date)
      [{ at: NOW - 40 * DAY, episode: 'Episode 3', key: 'm001c' }],
      [{ at: NOW - 50 * DAY, episode: 'Episode 1', key: 'm002a' }],
    ];
    expect(await run()).toBe('done');
    expect(read).toEqual([0, 1, 2]);

    const byEpisode = new Map(
      watched().map((item) => [item.episodeNumber, item.watchedAt]),
    );
    expect(byEpisode.get(1)).toBe(NOW - 10 * DAY);
    expect(byEpisode.get(2)).toBe(NOW - DAY);
    expect((await status()).sync).toMatchObject({ skipped: 1, written: 1 });
  });
});

describe('mergeSetCookies', () => {
  it('renews by name, drops an expired cookie, adds a new one', () => {
    const jar = mergeSetCookies(
      [...JAR, { ...JAR[0]!, name: 'gsid', value: 'old' }],
      [
        'NetflixId=new; Path=/; Max-Age=31536000; Secure; HttpOnly',
        'gsid=; Max-Age=0',
        'nfvdid=device; Domain=netflix.com; SameSite=Lax',
      ],
      '.netflix.com',
      0,
    );
    expect(jar.map(({ name, value }) => `${name}=${value}`)).toEqual([
      'NetflixId=new',
      'nfvdid=device',
    ]);
    expect(jar[1]?.domain).toBe('.netflix.com');
  });
});
