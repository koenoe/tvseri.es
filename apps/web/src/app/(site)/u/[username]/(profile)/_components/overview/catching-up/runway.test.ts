import type { CatchingUpItem } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { refsUpTo, runChips, runPlan, runwayView } from './runway';

const item = (over: Partial<CatchingUpItem> = {}): CatchingUpItem => ({
  episodeRuntimes: [58, 58, 58, 58],
  episodes: ['S05E05', 'S05E06', 'S05E07', 'S05E08'],
  nextUp: 'S05E05',
  posterImage: '',
  runtime: 58,
  runtimeMinutes: 232,
  runway: { date: '2026-11-15', daysToGo: 6, season: 6, state: 'upcoming' },
  seriesId: 1,
  slug: 'the-chosen',
  title: 'The Chosen',
  waiting: 4,
  ...over,
});

describe('runChips', () => {
  it('labels each chip and says what is left after it', () => {
    const chips = runChips(item());
    expect(chips.map((chip) => chip.label)).toEqual([
      'E05',
      'E06',
      'E07',
      'E08',
    ]);
    expect(chips[0]?.hint).toBe('Watched up to E05 · 2h 54m left');
    expect(chips[2]?.hint).toBe('Watched up to E07 · 58m left');
    expect(chips[3]?.hint).toBe('All caught up before S06');
  });

  it('keeps a row to one season: a later season is never a chip of the run', () => {
    const chips = runChips(
      item({
        episodes: ['S01E09', 'S01E10', 'S02E01'],
        runtimeMinutes: 174,
        runway: null,
        waiting: 3,
      }),
    );
    expect(chips.map((chip) => chip.label)).toEqual(['E09', 'E10']);
    expect(chips[1]?.hint).toBe('Watched up to E10 · 58m left');
  });

  it('counts what is left from every waiting episode, not only the eight sent', () => {
    const chips = runChips(
      item({
        episodeRuntimes: [60, 60, 60],
        episodes: ['S05E01', 'S05E02', 'S05E03'],
        runtime: 60,
        runtimeMinutes: 1200,
        waiting: 20,
      }),
    );
    expect(chips[0]?.hint).toBe('Watched up to E01 · 19h left');
  });

  it('takes each episode’s own runtime off the time left, not one runtime each', () => {
    // a 40m premiere and a 75m finale around two hours: the series' average is 58m
    const chips = runChips(
      item({
        episodeRuntimes: [40, 60, 60, 75],
        runtimeMinutes: 235,
        runway: null,
      }),
    );
    expect(chips[0]?.hint).toBe('Watched up to E05 · 3h 15m left');
    expect(chips[1]?.hint).toBe('Watched up to E06 · 2h 15m left');
    expect(chips[2]?.hint).toBe('Watched up to E07 · 1h 15m left');
  });

  it('says no time where a runtime is unknown', () => {
    const chips = runChips(
      item({ episodeRuntimes: [58, 0, 58, 58], runtimeMinutes: null }),
    );
    expect(chips[0]?.hint).toBe('Watched up to E05');
    const gap = runChips(item({ episodeRuntimes: [58, 0, 58, 58] }));
    expect(gap[0]?.hint).toBe('Watched up to E05 · 2h 54m left');
    expect(gap[1]?.hint).toBe('Watched up to E06');
  });

  it('after the premiere the last chip finishes the season', () => {
    const chips = runChips(
      item({
        episodes: ['S05E07', 'S05E08'],
        nextUp: 'S05E07',
        runway: { date: '2026-11-15', daysToGo: 0, season: 6, state: 'out' },
        waiting: 2,
      }),
    );
    expect(chips[1]?.hint).toBe('S05 done, S06 next');
  });
});

describe('runwayView', () => {
  it('counts down to the premiere', () => {
    expect(runwayView(item())).toMatchObject({
      chip: 'S06',
      countdown: '6 days to the premiere',
      date: 'Sun Nov 15',
      kind: 'upcoming',
      tight: false,
    });
  });

  it('is tight a day before', () => {
    expect(
      runwayView(
        item({
          runway: {
            date: '2026-11-10',
            daysToGo: 1,
            season: 6,
            state: 'upcoming',
          },
        }),
      ),
    ).toMatchObject({ countdown: '1 day to the premiere', tight: true });
  });

  it('says when it premiered once it is out', () => {
    expect(
      runwayView(
        item({
          runway: { date: '2026-11-15', daysToGo: 0, season: 6, state: 'out' },
        }),
      ),
    ).toMatchObject({ date: 'Premiered Sun Nov 15', kind: 'out' });
  });

  it('is nothing without a date', () => {
    expect(runwayView(item({ runway: null }))).toBeNull();
  });
});

describe('refsUpTo', () => {
  const chip = (episode: number) => ({
    code: `S05E0${episode}`,
    episode,
    hint: '',
    label: `E0${episode}`,
    season: 5,
  });
  const chips = [chip(5), chip(6), chip(7)];

  it('is the chips up to and including the tapped one, nothing later', () => {
    expect(refsUpTo(chips, chip(6))).toEqual([
      { episodeNumber: 5, seasonNumber: 5 },
      { episodeNumber: 6, seasonNumber: 5 },
    ]);
    expect(refsUpTo(chips, chip(9))).toEqual([]);
  });
});

describe('runPlan', () => {
  const codes = (season: number, from: number, count: number) =>
    Array.from(
      { length: count },
      (_, index) =>
        `S${String(season).padStart(2, '0')}E${String(from + index).padStart(2, '0')}`,
    );

  it('draws the run as it is: four chips and the premiere', () => {
    const plan = runPlan(item());
    expect(plan.chips.map((chip) => chip.label)).toEqual([
      'E05',
      'E06',
      'E07',
      'E08',
    ]);
    expect(plan.more).toMatchObject({ wide: 0 });
    expect(plan.next).toBeNull();
    // a phone's card holds two of them, "+2" and the premiere
    expect(plan.narrow).toBe(2);
    expect(plan.more.narrow).toBe(2);
    // a 360 phone's one, "+3" and the premiere
    expect(plan.small).toBe(1);
    expect(plan.more.small).toBe(3);
  });

  it('shows four chips and +N for a long season, fewer on a phone', () => {
    const plan = runPlan(
      item({ episodes: codes(8, 3, 8), runway: null, waiting: 26 }),
    );
    expect(plan.chips).toHaveLength(4);
    expect(plan.more).toEqual({ narrow: 23, season: 8, small: 24, wide: 22 });
    expect(plan.narrow).toBe(3);
    // a 360 phone's run is 196px: one fewer again, so nothing overlaps
    expect(plan.small).toBe(2);
  });

  it('ends the season with a chip of the next one when the run crosses', () => {
    const plan = runPlan(
      item({
        episodes: [...codes(1, 4, 3), ...codes(2, 1, 5)],
        runway: null,
        waiting: 30,
      }),
    );
    expect(plan.chips.map((chip) => chip.label)).toEqual(['E04', 'E05', 'E06']);
    expect(plan.more.wide).toBe(0);
    expect(plan.next).toMatchObject({ chip: 'S02', waiting: 27 });
  });

  it('leaves room for the premiere chip', () => {
    const plan = runPlan(item({ episodes: codes(5, 1, 8), waiting: 12 }));
    // four chips, +8 and the premiere do not fit 284px
    expect(plan.chips).toHaveLength(3);
    expect(plan.more.wide).toBe(9);
    expect(plan.narrow).toBe(2);
  });
});
