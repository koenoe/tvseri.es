import type { CatchingUpItem } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import type { SeriesBase } from '@/lib/marking/types';
import { liveCatchingUp, needsFreshRun } from './live';
import { runPlan } from './runway';

const codes = (season: number, from: number, count: number) =>
  Array.from(
    { length: count },
    (_, index) =>
      `S${String(season).padStart(2, '0')}E${String(from + index).padStart(2, '0')}`,
  );

/** The owner's row: 84 waiting, the API's eight codes from S01E07 */
const item = (over: Partial<CatchingUpItem> = {}): CatchingUpItem => ({
  episodeRuntimes: [44, 44, 44, 44, 44, 44, 44, 44],
  episodes: codes(1, 7, 8),
  nextUp: 'S01E07',
  posterImage: '',
  runtime: 44,
  runtimeMinutes: 3686,
  runway: null,
  seriesId: 1,
  slug: 'long-show',
  title: 'Long Show',
  waiting: 84,
  ...over,
});

/**
 * The show in the store: season 1 has 90 aired, E01 to E06 seen before the
 * overview was read (`seen`), so 84 from E07 waiting
 */
const view = (
  watched: ReadonlyArray<string>,
  skipped: ReadonlyArray<string> = [],
  seasons: SeriesBase['seasons'] = [
    { airedEpisodeCount: 90, episodeCount: 90, seasonNumber: 1 },
  ],
  seen: ReadonlyArray<string> = codes(1, 1, 6),
): SeriesBase => ({
  prefs: null,
  seasons,
  seriesId: 1,
  skipped: skipped as SeriesBase['skipped'],
  status: null,
  watched: Object.fromEntries(
    [...seen, ...watched].map((code) => [code, { runtime: 44, watchedAt: 1 }]),
  ),
});

describe('liveCatchingUp', () => {
  it('is the server item while the store has none of its episodes marked', () => {
    const server = item();
    expect(liveCatchingUp(server, undefined)).toBe(server);
    expect(liveCatchingUp(server, view([]))).toBe(server);
    // a mark past the run alone changes nothing here
    expect(liveCatchingUp(server, view(['S01E40']))).toBe(server);
  });

  it('moves the run on past the marked episodes: count, time and Next up follow', () => {
    const live = liveCatchingUp(item(), view(codes(1, 7, 4)));
    expect(live).toMatchObject({
      // the four codes left, then the store's next open ones (no runtime sent)
      episodeRuntimes: [44, 44, 44, 44, 0, 0, 0, 0],
      episodes: codes(1, 11, 8),
      nextUp: 'S01E11',
      runtimeMinutes: 3686 - 4 * 44,
      waiting: 80,
    });
  });

  it('plans the next chips into the freed spots, and +N follows', () => {
    const before = runPlan(item());
    expect(before.chips.map((chip) => chip.label)).toEqual([
      'E07',
      'E08',
      'E09',
      'E10',
    ]);
    expect(before.more.wide).toBe(80);
    const live = liveCatchingUp(item(), view(codes(1, 7, 4)));
    const after = runPlan(live ?? item());
    expect(after.chips.map((chip) => chip.label)).toEqual([
      'E11',
      'E12',
      'E13',
      'E14',
    ]);
    expect(after.more.wide).toBe(76);
  });

  it('counts a skipped episode as done, and takes each one’s own runtime off', () => {
    const live = liveCatchingUp(
      item({ episodeRuntimes: [40, 60, 44, 44, 44, 44, 44, 44] }),
      view(['S01E07'], ['S01E08']),
    );
    expect(live).toMatchObject({
      episodes: codes(1, 9, 8),
      runtimeMinutes: 3686 - 100,
      waiting: 82,
    });
  });

  it('says no time once a marked episode’s runtime is unknown', () => {
    const live = liveCatchingUp(
      item({ episodeRuntimes: [0, 44, 44, 44, 44, 44, 44, 44] }),
      view(['S01E07']),
    );
    expect(live?.runtimeMinutes).toBeNull();
  });

  it('crosses into the next season the API sent', () => {
    const server = item({
      episodes: [...codes(1, 9, 2), ...codes(2, 1, 6)],
      nextUp: 'S01E09',
      waiting: 30,
    });
    const live = liveCatchingUp(
      server,
      view(
        codes(1, 9, 2),
        [],
        [
          { airedEpisodeCount: 10, episodeCount: 10, seasonNumber: 1 },
          { airedEpisodeCount: 28, episodeCount: 28, seasonNumber: 2 },
        ],
        codes(1, 1, 8),
      ),
    );
    expect(live?.nextUp).toBe('S02E01');
    const plan = runPlan(live ?? server);
    expect(plan.chips[0]?.code).toBe('S02E01');
    expect(plan.more.season).toBe(2);
  });

  it('goes on from the store once every code sent is marked, never a run of none', () => {
    const live = liveCatchingUp(item(), view(codes(1, 7, 8)));
    expect(live).toMatchObject({
      episodes: codes(1, 15, 8),
      nextUp: 'S01E15',
      runtimeMinutes: 3686 - 8 * 44,
      waiting: 76,
    });
    const plan = runPlan(live ?? item());
    expect(plan.chips.map((chip) => chip.label)).toEqual([
      'E15',
      'E16',
      'E17',
      'E18',
    ]);
    expect(plan.more).toMatchObject({ season: 1, wide: 72 });
    // a mark past the codes sent counts too; its runtime isn't known
    const past = liveCatchingUp(item(), view(codes(1, 7, 9)));
    expect(past).toMatchObject({
      nextUp: 'S01E16',
      runtimeMinutes: null,
      waiting: 75,
    });
  });

  it('takes back the episodes an Undo opened again before a refreshed item', () => {
    // the overview was read after E07 to E14 were marked; then Undo
    const fresh = item({
      episodes: codes(1, 15, 8),
      nextUp: 'S01E15',
      runtimeMinutes: 76 * 44,
      waiting: 76,
    });
    const live = liveCatchingUp(fresh, view([]));
    expect(live).toMatchObject({
      episodes: codes(1, 7, 8),
      nextUp: 'S01E07',
      // E07 to E14's runtimes aren't in this item
      runtimeMinutes: null,
      waiting: 84,
    });
    expect(needsFreshRun(fresh, view([]))).toBe(true);
  });

  it('leaves Catching up once every waiting episode is marked', () => {
    const server = item({ episodes: codes(1, 7, 4), waiting: 4 });
    expect(liveCatchingUp(server, view(codes(1, 7, 4)))).toBeNull();
  });
});

describe('needsFreshRun', () => {
  it('not while the server item is untouched', () => {
    expect(needsFreshRun(item(), view([]))).toBe(false);
    expect(needsFreshRun(item(), undefined)).toBe(false);
  });

  it('not while some code sent is left (the store carries the run on)', () => {
    expect(needsFreshRun(item(), view(codes(1, 7, 4)))).toBe(false);
    expect(needsFreshRun(item(), view(codes(1, 7, 7)))).toBe(false);
  });

  it('once the marks use up every code the API sent', () => {
    expect(needsFreshRun(item(), view(codes(1, 7, 8)))).toBe(true);
  });

  it('once the show leaves Catching up (too few waiting, or none)', () => {
    const short = item({ episodes: codes(1, 7, 4), waiting: 4 });
    expect(needsFreshRun(short, view(['S01E07']))).toBe(false);
    expect(needsFreshRun(short, view(codes(1, 7, 2)))).toBe(true);
    expect(needsFreshRun(short, view(codes(1, 7, 4)))).toBe(true);
  });
});
