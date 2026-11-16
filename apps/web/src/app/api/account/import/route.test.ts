import { revalidateTag } from 'next/cache';
import { after, NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IMPORT_WRITE_BATCH_SIZE } from '@/app/(site)/settings/import/_lib/contract';
import { readNdjson } from '@/app/(site)/settings/import/_lib/ndjson';
import auth from '@/auth';
import { ApiError, apiFetch } from '@/lib/api/client';

import { POST } from './route';

vi.mock('@/auth', () => ({ default: vi.fn() }));
vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
}));
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: vi.fn(),
}));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch: vi.fn(),
}));

const NOW = Date.UTC(2026, 10, 12, 21, 40);
const noon = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day, 12).getTime();

const SESSION = {
  accessToken: 'session-token',
  expiresAt: NOW + 3_600_000,
  user: { country: 'GB', id: 'USER-SESSION' },
};

const episode = (
  seasonNumber: number,
  episodeNumber: number,
  title: string,
) => ({
  airDate: '2024-01-01',
  description: '',
  episodeNumber,
  hasAired: true,
  id: seasonNumber * 100 + episodeNumber,
  runtime: 50,
  seasonNumber,
  stillImage: '',
  stillPath: '/still.jpg',
  title,
});

const series = (id: number, title: string, year: string, network: string) => ({
  firstAirDate: `${year}-01-01`,
  id,
  network: { id: 1, logo: '', name: network },
  numberOfSeasons: 1,
  posterImage: `https://img.example.com/${id}.jpg`,
  posterPath: `/${id}.jpg`,
  releaseYear: year,
  seasons: [{ seasonNumber: 1 }],
  slug: `${id}-${title.toLowerCase().replace(/\W+/g, '-')}`,
  title,
});

const CATALOGUE = new Map([
  [4, series(4, 'Black Mirror', '2011', 'Netflix')],
  [10, series(10, 'Top Boy', '2011', 'Channel 4')],
  [11, series(11, 'Top Boy', '2019', 'Netflix')],
]);
const SEARCH: Record<string, ReadonlyArray<number>> = {
  'black mirror': [4],
  'top boy': [10, 11],
};
// Every series has the same two episodes in season 1
const EPISODES = [episode(1, 1, 'Common People'), episode(1, 2, 'Bête Noire')];

type Call = Readonly<{
  path: string;
  accessToken?: string;
  body?: unknown;
  params?: Record<string, string | number>;
}>;
let calls: Call[] = [];
/** A test steers what the write route answers */
let onWrite: (call: Call, index: number) => unknown = () => ({
  skipped: 0,
  written: 0,
});
let writeCount = 0;

beforeEach(() => {
  vi.mocked(after).mockReset();
  vi.mocked(revalidateTag).mockReset();
  calls = [];
  writeCount = 0;
  onWrite = (call) => ({
    skipped: 0,
    written: (call.body as unknown[]).length,
  });
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.mocked(auth).mockResolvedValue(SESSION as never);
  vi.mocked(apiFetch).mockImplementation((async (
    path: string,
    options: Omit<Call, 'path'> & { query?: Record<string, string> } = {},
  ) => {
    const call = { ...options, path };
    calls.push(call);
    switch (path) {
      case '/discover/watch-providers':
        return [
          { id: 8, logo: '', logoPath: '', name: 'Netflix' },
          { id: 350, logo: '', logoPath: '', name: 'Apple TV' },
        ];
      case '/search/series':
        return (SEARCH[options.query?.q ?? ''] ?? []).map((id) =>
          CATALOGUE.get(id),
        );
      case '/series/:id':
        return CATALOGUE.get(Number(options.params?.id)) ?? null;
      case '/series/:id/season/:season':
        return { episodes: EPISODES, seasonNumber: 1 };
      case '/me/imports/check':
        return {
          alreadyWatched: [],
          skipped: 0,
          written: (options.body as unknown[]).length,
        };
      case '/me/imports/:importId/batch': {
        const result = onWrite(call, writeCount++);
        if (result instanceof Error) {
          throw result;
        }
        return result;
      }
    }
    throw new Error(`unexpected call ${path}`);
  }) as never);
});

const request = (
  body: unknown,
  { dryRun = false, signal }: { dryRun?: boolean; signal?: AbortSignal } = {},
) =>
  new NextRequest(
    `https://www.tvseri.es/api/account/import${dryRun ? '?dryRun=1' : ''}`,
    {
      body: JSON.stringify(body),
      headers: {
        'content-type': 'application/json',
        'sec-fetch-site': 'same-origin',
        'x-vercel-ip-country': 'NL',
      },
      method: 'POST',
      signal,
    },
  );

const events = async (response: Response) => {
  const out: Array<Record<string, unknown>> = [];
  for await (const event of readNdjson(response.body!)) {
    out.push(event as Record<string, unknown>);
  }
  return out;
};

const row = (index: number, overrides: Record<string, unknown> = {}) => ({
  episode: 'Common People',
  index,
  season: 'Season 1',
  title: 'Black Mirror',
  watchedAt: noon(2026, 11, 5),
  ...overrides,
});

const batchCalls = () =>
  calls.filter((c) => c.path === '/me/imports/:importId/batch');
const checkCalls = () => calls.filter((c) => c.path === '/me/imports/check');

describe('POST /api/account/import', () => {
  it('answers 401 signed out and calls nothing', async () => {
    vi.mocked(auth).mockResolvedValue({
      accessToken: null,
      expiresAt: null,
      user: null,
    });
    const response = await POST(request({ importId: 'imp', rows: [row(0)] }));
    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(calls).toEqual([]);
  });

  it('streams NDJSON that is never cached', async () => {
    const response = await POST(request({ importId: 'imp', rows: [row(0)] }));
    expect(response.headers.get('content-type')).toBe(
      'application/x-ndjson; charset=utf-8',
    );
    expect(response.headers.get('cache-control')).toBe('no-store');
    await events(response);
  });

  describe('validation', () => {
    it.each([
      [
        'an import id over 64 chars',
        { importId: 'x'.repeat(65), rows: [row(0)] },
      ],
      ['no rows', { importId: 'i', rows: [] }],
      [
        'over 100 rows',
        { importId: 'i', rows: Array.from({ length: 101 }, (_, i) => row(i)) },
      ],
      ['no import id and no dry run', { rows: [row(0)] }],
      ['not JSON-shaped rows', { importId: 'i', rows: 'nope' }],
      [
        'a row without an index',
        { importId: 'i', rows: [row(0), { ...row(1), index: 'one' }] },
      ],
    ])('400 for %s', async (_name, body) => {
      const response = await POST(request(body));
      expect(response.status).toBe(400);
      expect(calls).toEqual([]);
    });

    it.each([
      ['a future date', { watchedAt: NOW + 5 * 86_400_000 }],
      ['a date before 2000', { watchedAt: Date.UTC(1999, 5, 1) }],
      ['a fractional date', { watchedAt: NOW - 0.5 }],
      ['a title over 1000 chars', { title: 'x'.repeat(1001) }],
      ['a service over 100 chars', { watchProvider: 'y'.repeat(101) }],
      ['a negative season number', { seasonNumber: -1 }],
      ['a fractional series id', { seriesId: 1.5 }],
      ['series id 0', { seriesId: 0 }],
      ['a title that is not text', { title: 42 }],
    ])(
      'a row with %s is a failed problem; the rows around it import',
      async (_name, overrides) => {
        const response = await POST(
          request({
            importId: 'i',
            rows: [
              row(0),
              row(1, overrides),
              row(2, { episode: 'Bête Noire' }),
            ],
          }),
        );
        expect(response.status).toBe(200);
        const out = await events(response);
        expect(out.flatMap((e) => e.problems)).toEqual([
          expect.objectContaining({ index: 1, kind: 'failed' }),
        ]);
        expect(out.reduce((sum, e) => sum + Number(e.written), 0)).toBe(2);
        expect(batchCalls().map((c) => (c.body as unknown[]).length)).toEqual([
          2,
        ]);
      },
    );

    it('a bad row in a dry run is a failed problem in the checked event', async () => {
      const response = await POST(
        request(
          { rows: [row(0), row(1, { title: 'x'.repeat(1001) })] },
          { dryRun: true },
        ),
      );
      expect(response.status).toBe(200);
      const out = await events(response);
      expect(out.every((e) => e.status === 'checked')).toBe(true);
      expect(out.reduce((sum, e) => sum + Number(e.matched), 0)).toBe(1);
      const problems = out.flatMap(
        (e) => e.problems as ReadonlyArray<Record<string, unknown>>,
      );
      expect(problems).toHaveLength(1);
      expect(problems[0]).toMatchObject({
        index: 1,
        kind: 'failed',
        row: { episode: 'Common People', season: 'Season 1' },
      });
      // What comes back for display is short
      const shown = problems[0]?.row as { title: string } | undefined;
      expect(shown?.title.length).toBeLessThanOrEqual(200);
    });

    it('only bad rows: one event with their problems, nothing written', async () => {
      const response = await POST(
        request({ importId: 'i', rows: [row(0, { seriesId: 0 })] }),
      );
      const out = await events(response);
      expect(out).toEqual([
        {
          current: null,
          problems: [expect.objectContaining({ index: 0, kind: 'failed' })],
          shows: [],
          skipped: 0,
          status: 'progress',
          written: 0,
        },
      ]);
      expect(batchCalls()).toEqual([]);
    });

    it('400 for a body that is not JSON', async () => {
      const response = await POST(
        new NextRequest('https://www.tvseri.es/api/account/import', {
          body: 'not json',
          headers: { 'content-type': 'application/json' },
          method: 'POST',
        }),
      );
      expect(response.status).toBe(400);
    });

    it('takes "I don’t remember" (null) and today', async () => {
      const response = await POST(
        request({
          importId: 'i',
          rows: [
            row(0, { watchedAt: null }),
            row(1, { episode: 2, watchedAt: NOW }),
          ],
        }),
      );
      expect(response.status).toBe(200);
      await events(response);
    });
  });

  describe('a dry run', () => {
    it('never calls the batch route and writes nothing', async () => {
      const response = await POST(
        request(
          { importId: 'imp-1', rows: [row(0), row(1, { episode: 2 })] },
          { dryRun: true },
        ),
      );
      const out = await events(response);
      expect(batchCalls()).toEqual([]);
      expect(calls.some((c) => c.path === '/me/imports')).toBe(false);
      expect(out).toEqual([
        {
          alreadyWatched: 0,
          matched: 2,
          problems: [],
          seriesIds: [4],
          status: 'checked',
        },
      ]);
    });

    it('checks matched rows in the API’s item shape, with the session token', async () => {
      await events(await POST(request({ rows: [row(0)] }, { dryRun: true })));
      const [check] = checkCalls();
      expect(check?.accessToken).toBe('session-token');
      expect(check?.body).toEqual([
        {
          episode: {
            airDate: '2024-01-01',
            episodeNumber: 1,
            runtime: 50,
            seasonNumber: 1,
            stillPath: '/still.jpg',
            title: 'Common People',
          },
          tvSeries: {
            id: 4,
            posterPath: '/4.jpg',
            slug: '4-black-mirror',
            title: 'Black Mirror',
          },
          watchedAt: noon(2026, 11, 5),
          watchProvider: null,
        },
      ]);
    });

    it('reports what the API says is already watched', async () => {
      const original = vi.mocked(apiFetch).getMockImplementation()!;
      vi.mocked(apiFetch).mockImplementation((async (
        path: string,
        options: never,
      ) => {
        if (path === '/me/imports/check') {
          return {
            alreadyWatched: [{ code: 'S01E01', seriesId: 4 }],
            skipped: 1,
            written: 1,
          };
        }
        return original(path, options);
      }) as never);
      const out = await events(
        await POST(
          request({ rows: [row(0), row(1, { episode: 2 })] }, { dryRun: true }),
        ),
      );
      expect(out[0]).toMatchObject({
        alreadyWatched: 1,
        matched: 2,
        status: 'checked',
      });
    });

    it('checks the whole request in one event (one check call; it writes nothing)', async () => {
      const rows = Array.from({ length: IMPORT_WRITE_BATCH_SIZE + 5 }, (_, i) =>
        row(i, { episode: (i % 2) + 1 }),
      );
      const out = await events(await POST(request({ rows }, { dryRun: true })));
      expect(out.map((e) => e.matched)).toEqual([IMPORT_WRITE_BATCH_SIZE + 5]);
      expect(
        calls.filter((call) => call.path === '/me/imports/check'),
      ).toHaveLength(1);
    });
  });

  describe('the session user', () => {
    it('never sends a user id, and ignores one in the body', async () => {
      await events(
        await POST(
          request({
            importId: 'imp-1',
            rows: [{ ...row(0), userId: 'USER-ATTACKER' }],
            userId: 'USER-ATTACKER',
          }),
        ),
      );
      expect(JSON.stringify(calls)).not.toContain('USER-ATTACKER');
      for (const call of calls) {
        // The API reads the user from the token: it is the session's, always
        if (call.path.startsWith('/me/')) {
          expect(call.accessToken).toBe('session-token');
        }
        expect(call.path).not.toContain('/user/');
      }
      expect(JSON.stringify(batchCalls()[0]?.body)).not.toContain('userId');
    });

    it('writes into the import named in the body, with the session token', async () => {
      await events(await POST(request({ importId: 'imp-1', rows: [row(0)] })));
      expect(batchCalls()).toHaveLength(1);
      expect(batchCalls()[0]).toMatchObject({
        accessToken: 'session-token',
        params: { importId: 'imp-1' },
      });
    });
  });

  describe('an import', () => {
    it('writes a batch and reports written, skipped and the shows', async () => {
      onWrite = () => ({ skipped: 1, written: 1 });
      const out = await events(
        await POST(
          request({
            importId: 'imp-1',
            rows: [row(0), row(1, { episode: 2 })],
          }),
        ),
      );
      expect(out).toEqual([
        {
          current: 'Black Mirror',
          problems: [],
          shows: [
            {
              count: 1,
              id: 4,
              posterImage: 'https://img.example.com/4.jpg',
              slug: '4-black-mirror',
              title: 'Black Mirror',
            },
          ],
          skipped: 1,
          status: 'progress',
          written: 1,
        },
      ]);
    });

    it('"I don’t remember" is dateUnknown with the time it was marked', async () => {
      await events(
        await POST(
          request({ importId: 'imp-1', rows: [row(0, { watchedAt: null })] }),
        ),
      );
      expect(batchCalls()[0]?.body).toMatchObject([
        { dateUnknown: true, watchedAt: NOW },
      ]);
    });

    it('a dated row carries no dateUnknown', async () => {
      await events(await POST(request({ importId: 'imp-1', rows: [row(0)] })));
      expect(batchCalls()[0]?.body).not.toMatchObject([{ dateUnknown: true }]);
    });

    it('matches the watch provider to the region’s services, case-insensitively', async () => {
      await events(
        await POST(
          request({
            importId: 'imp-1',
            rows: [
              row(0, { watchProvider: 'netflix' }),
              row(1, { episode: 2, watchProvider: 'Apple TV+' }),
              row(2, { episode: 'x-nope', watchProvider: 'Quibi' }),
            ],
          }),
        ),
      );
      const items = batchCalls()[0]?.body as Array<{
        watchProvider: { name: string } | null;
      }>;
      expect(items.map((i) => i.watchProvider?.name ?? null)).toEqual([
        'Netflix',
        'Apple TV',
      ]);
      // The providers come from the user's region
      expect(
        calls.find((c) => c.path === '/discover/watch-providers'),
      ).toMatchObject({ query: { region: 'GB' } });
    });

    it('splits large requests into write batches', async () => {
      const rows = Array.from({ length: IMPORT_WRITE_BATCH_SIZE * 2 }, (_, i) =>
        row(i, { episode: (i % 2) + 1 }),
      );
      const out = await events(
        await POST(request({ importId: 'imp-1', rows })),
      );
      expect(out).toHaveLength(2);
      expect(batchCalls().map((c) => (c.body as unknown[]).length)).toEqual([
        IMPORT_WRITE_BATCH_SIZE,
        IMPORT_WRITE_BATCH_SIZE,
      ]);
    });
  });

  describe('doubtful matches are never written', () => {
    it('two series with the title and the episode: a problem with both candidates', async () => {
      const out = await events(
        await POST(
          request({
            importId: 'imp-1',
            rows: [row(0, { title: 'Top Boy' })],
          }),
        ),
      );
      expect(batchCalls()).toEqual([]);
      expect(out).toHaveLength(1);
      expect(out[0]).toMatchObject({ status: 'progress', written: 0 });
      const problems = (out[0]?.problems ?? []) as Array<
        Record<string, unknown>
      >;
      const problem = problems[0];
      expect(problem).toMatchObject({
        index: 0,
        kind: 'ambiguous',
        row: { episode: 'Common People', season: 'Season 1', title: 'Top Boy' },
      });
      expect(
        (
          (problem?.candidates ?? []) as Array<{
            id: number;
            network: string;
            year: string;
          }>
        ).map((c) => [c.id, c.year, c.network]),
      ).toEqual([
        [10, '2011', 'Channel 4'],
        [11, '2019', 'Netflix'],
      ]);
    });

    it('a title that is not in the catalogue is a problem, not a guess', async () => {
      const out = await events(
        await POST(
          request({
            importId: 'imp-1',
            rows: [row(0, { title: 'Trust No One' })],
          }),
        ),
      );
      expect(batchCalls()).toEqual([]);
      expect(out[0]?.problems).toMatchObject([
        { index: 0, kind: 'series-not-found' },
      ]);
    });

    it('an episode the series does not have: the problem carries the episodes', async () => {
      const out = await events(
        await POST(
          request({
            importId: 'imp-1',
            rows: [row(0, { episode: 'Part 1 Recap' })],
          }),
        ),
      );
      expect(batchCalls()).toEqual([]);
      expect(out[0]?.problems).toMatchObject([
        {
          episodes: [
            { episodeNumber: 1, seasonNumber: 1, title: 'Common People' },
            { episodeNumber: 2, seasonNumber: 1, title: 'Bête Noire' },
          ],
          kind: 'episode-not-found',
          series: { id: 4 },
        },
      ]);
    });

    it('a doubtful row does not hold back the good rows of its batch', async () => {
      const out = await events(
        await POST(
          request({
            importId: 'imp-1',
            rows: [row(0), row(1, { title: 'Top Boy' })],
          }),
        ),
      );
      expect(batchCalls()).toHaveLength(1);
      expect(batchCalls()[0]?.body).toHaveLength(1);
      expect(out[0]).toMatchObject({ written: 1 });
      expect(out[0]?.problems).toHaveLength(1);
    });

    it('the user’s pick (seriesId) settles it', async () => {
      await events(
        await POST(
          request({
            importId: 'imp-1',
            rows: [row(0, { seriesId: 11, title: 'Top Boy' })],
          }),
        ),
      );
      expect(batchCalls()[0]?.body).toMatchObject([{ tvSeries: { id: 11 } }]);
      expect(calls.some((c) => c.path === '/search/series')).toBe(false);
    });
  });

  describe('failures', () => {
    const twoBatches = () =>
      Array.from({ length: IMPORT_WRITE_BATCH_SIZE + 2 }, (_, i) =>
        row(i, { episode: (i % 2) + 1 }),
      );

    it('401 from the API stops with unauthenticated', async () => {
      onWrite = () => new ApiError(401, 'Unauthorized');
      const out = await events(
        await POST(request({ importId: 'imp-1', rows: twoBatches() })),
      );
      expect(out).toEqual([{ error: 'unauthenticated', status: 'error' }]);
      expect(batchCalls()).toHaveLength(1);
    });

    it('401 mid-stream keeps what was written and stops', async () => {
      onWrite = (call, index) =>
        index === 0
          ? { skipped: 0, written: (call.body as unknown[]).length }
          : new ApiError(401, 'Unauthorized');
      const out = await events(
        await POST(request({ importId: 'imp-1', rows: twoBatches() })),
      );
      expect(out.map((e) => e.status)).toEqual(['progress', 'error']);
      expect(out[1]).toEqual({ error: 'unauthenticated', status: 'error' });
    });

    it('401 while matching stops with unauthenticated too', async () => {
      const original = vi.mocked(apiFetch).getMockImplementation()!;
      vi.mocked(apiFetch).mockImplementation((async (
        path: string,
        options: never,
      ) => {
        if (path === '/search/series') {
          throw new ApiError(401, 'Unauthorized');
        }
        return original(path, options);
      }) as never);
      const out = await events(
        await POST(request({ importId: 'imp-1', rows: [row(0)] })),
      );
      // Public catalogue reads do not need the session; a 401 there is the API's
      expect(out).toEqual([{ error: 'unauthenticated', status: 'error' }]);
    });

    it('409 is a conflict: the import is no longer the last one', async () => {
      onWrite = () => new ApiError(409, 'ImportNotOpen');
      const out = await events(
        await POST(request({ importId: 'imp-1', rows: twoBatches() })),
      );
      expect(out).toEqual([{ error: 'conflict', status: 'error' }]);
    });

    it('another failed batch: its rows are failed problems, and the next batch goes on', async () => {
      onWrite = (call, index) =>
        index === 0
          ? new ApiError(500, 'Internal Server Error')
          : { skipped: 0, written: (call.body as unknown[]).length };
      const out = await events(
        await POST(request({ importId: 'imp-1', rows: twoBatches() })),
      );
      expect(out).toHaveLength(2);
      expect(out[0]).toMatchObject({
        shows: [],
        status: 'progress',
        written: 0,
      });
      const problems = out[0]?.problems as Array<{ kind: string }>;
      expect(problems).toHaveLength(IMPORT_WRITE_BATCH_SIZE);
      expect(problems.every((p) => p.kind === 'failed')).toBe(true);
      expect(out[1]).toMatchObject({ problems: [], written: 2 });
    });

    it('a row whose lookup fails is a failed problem, the rest go on', async () => {
      const original = vi.mocked(apiFetch).getMockImplementation()!;
      vi.mocked(apiFetch).mockImplementation((async (
        path: string,
        options: never,
      ) => {
        if (path === '/search/series') {
          throw new ApiError(500, 'boom');
        }
        return original(path, options);
      }) as never);
      const out = await events(
        await POST(request({ importId: 'imp-1', rows: [row(0)] })),
      );
      expect(out[0]?.problems).toMatchObject([{ index: 0, kind: 'failed' }]);
    });

    it('a failing check is an error event', async () => {
      const original = vi.mocked(apiFetch).getMockImplementation()!;
      vi.mocked(apiFetch).mockImplementation((async (
        path: string,
        options: never,
      ) => {
        if (path === '/me/imports/check') {
          throw new ApiError(503, 'down');
        }
        return original(path, options);
      }) as never);
      const out = await events(
        await POST(request({ rows: [row(0)] }, { dryRun: true })),
      );
      expect(out).toEqual([{ error: 'failed', status: 'error' }]);
    });

    it('stops when the request is aborted', async () => {
      const controller = new AbortController();
      controller.abort();
      const out = await events(
        await POST(
          request(
            { importId: 'imp-1', rows: twoBatches() },
            { signal: controller.signal },
          ),
        ),
      );
      expect(out).toEqual([]);
      expect(batchCalls()).toEqual([]);
    });
  });
});

describe('the viewer’s stats after an import', () => {
  /** Runs what the route left for after the response, as Next would */
  const runAfter = async () => {
    for (const [task] of vi.mocked(after).mock.calls) {
      await (typeof task === 'function' ? task() : task);
    }
  };

  it('expire once the import’s stream is done', async () => {
    await events(
      await POST(request({ importId: 'imp-1', rows: [row(0), row(1)] })),
    );
    expect(revalidateTag).not.toHaveBeenCalled();
    await runAfter();
    expect(revalidateTag).toHaveBeenCalledTimes(1);
    expect(revalidateTag).toHaveBeenCalledWith('stats:USER-SESSION', {
      expire: 0,
    });
  });

  it('stay as they are after a dry run', async () => {
    await events(await POST(request({ rows: [row(0)] }, { dryRun: true })));
    await runAfter();
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

describe('POST /api/account/import from another site', () => {
  it('refuses a cross-site or same-site request before reading the session', async () => {
    for (const site of ['cross-site', 'same-site']) {
      const response = await POST(
        new NextRequest('https://www.tvseri.es/api/account/import?dryRun=1', {
          body: JSON.stringify({ rows: [] }),
          headers: {
            'content-type': 'application/json',
            'sec-fetch-site': site,
          },
          method: 'POST',
        }),
      );
      expect(response.status).toBe(403);
    }
  });

  it('refuses a simple (text/plain) request', async () => {
    const response = await POST(
      new NextRequest('https://www.tvseri.es/api/account/import?dryRun=1', {
        body: JSON.stringify({ rows: [] }),
        headers: {
          'content-type': 'text/plain',
          'sec-fetch-site': 'same-origin',
        },
        method: 'POST',
      }),
    );
    expect(response.status).toBe(403);
  });
});
