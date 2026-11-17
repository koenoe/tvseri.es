import type { Episode, Season, TvSeries } from '@tvseri.es/schemas';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiFetch } from '@/lib/api/client';
import { loadSeriesForWrite } from '@/lib/series/forWrite';
import { loadSeason } from '@/lib/series/loaders';
import { loadRegionProviders } from '@/lib/watchProviders/regionProviders';
import type { CheckEvent, ImportRow } from './contract';
import { runImport } from './importRun';
import { searchSeries } from './loaders';
import { toNdjsonLine } from './ndjson';
import { runChunks } from './runChunks';

vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch: vi.fn(),
}));
vi.mock('@/lib/series/loaders', () => ({ loadSeason: vi.fn() }));
vi.mock('@/lib/series/forWrite', () => ({ loadSeriesForWrite: vi.fn() }));
vi.mock('./loaders', () => ({ searchSeries: vi.fn() }));
vi.mock('@/lib/watchProviders/regionProviders', () => ({
  loadRegionProviders: vi.fn(),
}));

/**
 * The Check's speed on a cold catalogue: a Netflix-like file (2,500 rows,
 * 150 shows watched in binges and revisited, every catalogue read and API
 * call 300 ms) through the browser's chunking and the route's matching,
 * on a virtual clock. Every request starts cold (production: a new
 * instance's `use cache` is empty), so only what the run itself shares
 * counts.
 */

const LATENCY_MS = 300;
const SHOWS = 150;
const ROWS = 2500;

const later = <T>(value: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), LATENCY_MS));

const episodeTitle = (show: number, season: number, episode: number) =>
  `Chapter ${show}-${season}-${episode}`;

const seasonsOf = (show: number) => 2 + (show % 3);
const EPISODES = 10;

const series = (id: number): TvSeries =>
  ({
    id,
    numberOfSeasons: seasonsOf(id),
    seasons: Array.from({ length: seasonsOf(id) }, (_, index) => ({
      seasonNumber: index + 1,
    })),
    title: `Show ${id}`,
  }) as unknown as TvSeries;

const season = (id: number, seasonNumber: number): Season =>
  ({
    episodes: Array.from(
      { length: EPISODES },
      (_, index) =>
        ({
          episodeNumber: index + 1,
          title: episodeTitle(id, seasonNumber, index + 1),
        }) as Episode,
    ),
    seasonNumber,
  }) as unknown as Season;

/** Binges of 3 to 12 episodes, shows revisited over time, like a viewing history */
const netflixRows = (): ImportRow[] => {
  const rows: ImportRow[] = [];
  const position = new Map<number, number>();
  let seed = 7;
  const random = () => {
    seed = (seed * 16_807) % 2_147_483_647;
    return seed / 2_147_483_647;
  };
  while (rows.length < ROWS) {
    const show = 1 + Math.floor(random() * SHOWS);
    const binge = 3 + Math.floor(random() * 10);
    for (let i = 0; i < binge && rows.length < ROWS; i++) {
      const at = position.get(show) ?? 0;
      position.set(show, at + 1);
      const seasonNumber = 1 + (Math.floor(at / EPISODES) % seasonsOf(show));
      const episode = 1 + (at % EPISODES);
      rows.push({
        episode: episodeTitle(show, seasonNumber, episode),
        index: rows.length,
        season: `Season ${seasonNumber}`,
        title: `Show ${show}`,
        watchedAt: Date.UTC(2020, 0, 1) + rows.length * 3_600_000,
      });
    }
  }
  return rows;
};

const calls = { check: 0, search: 0, season: 0, series: 0 };

/** The browser's fetch, answered by the route's generator (no HTTP) */
const routeFetch: typeof fetch = async (_url, init) => {
  const { rows } = JSON.parse(String(init?.body)) as { rows: ImportRow[] };
  const events = runImport({
    accessToken: 'token',
    now: Date.UTC(2026, 10, 13),
    region: 'GB',
    rows,
    signal: new AbortController().signal,
  });
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await events.next();
      if (done) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(toNdjsonLine(value)));
    },
  });
  return new Response(body, { status: 200 });
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  Object.assign(calls, { check: 0, search: 0, season: 0, series: 0 });
  vi.mocked(searchSeries).mockImplementation(async (title) => {
    calls.search += 1;
    const id = Number(title.replace('show ', ''));
    return later([series(id)]);
  });
  vi.mocked(loadSeriesForWrite).mockImplementation(async (id) => {
    calls.series += 1;
    return later(series(id));
  });
  vi.mocked(loadSeason).mockImplementation(async (id, seasonNumber) => {
    calls.season += 1;
    return later(season(id, seasonNumber));
  });
  vi.mocked(loadRegionProviders).mockResolvedValue([]);
  vi.mocked(apiFetch).mockImplementation(async (_path, options) => {
    calls.check += 1;
    const body = (options as { body: ReadonlyArray<unknown> }).body;
    return later({ alreadyWatched: [], skipped: 0, written: body.length });
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the Check on a cold catalogue', () => {
  it('checks 2,500 rows of 150 shows well under a minute', async () => {
    const rows = netflixRows();
    let checked = 0;
    let finished = false;
    const run = runChunks({
      fetcher: routeFetch,
      kind: 'check',
      onEvent: (event: Exclude<CheckEvent, { status: 'error' }>) => {
        checked += event.matched + event.problems.length;
      },
      rows,
      signal: new AbortController().signal,
    }).then((outcome) => {
      finished = true;
      return outcome;
    });

    let elapsed = 0;
    while (!finished && elapsed < 3_600_000) {
      await vi.advanceTimersByTimeAsync(100);
      elapsed += 100;
    }
    expect(await run).toEqual({ status: 'done' });
    expect(checked).toBe(rows.length);

    console.info(
      `[check speed] ${rows.length} rows, ${new Set(rows.map((r) => r.title)).size} shows: ${(elapsed / 1000).toFixed(1)} s virtual; calls: ${JSON.stringify(calls)}`,
    );
    expect(elapsed).toBeLessThan(60_000);
  });
});
