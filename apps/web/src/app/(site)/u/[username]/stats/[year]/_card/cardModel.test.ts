import type { StatsShowRow, StatsSummary } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import {
  blameShow,
  buildCardModel,
  cardDescription,
  cardStreak,
  headlineLines,
  mostShowsYet,
  wallShows,
} from './cardModel';

const weeksWith = (values: Readonly<Record<number, number>>) =>
  Array.from({ length: 53 }, (_, index) => values[index] ?? 0);

const show = (
  id: number,
  title: string,
  runtimeMinutes: number,
  weeks: Readonly<Record<number, number>> = {},
): StatsShowRow => ({
  episodes: Math.round(runtimeMinutes / 50),
  firstWatchedAt: 0,
  id,
  lastWatchedAt: 0,
  posterImage: `https://image.tmdb.org/t/p/w300_and_h450_bestv2/${id}.jpg`,
  runtimeMinutes,
  slug: `show-${id}`,
  title,
  weeks: weeksWith(weeks),
});

const metrics = (seriesCount: number, totalRuntime: number) => ({
  avgPerDay: 1,
  episodeCount: 615,
  longestStreak: 42,
  seriesCount,
  totalRuntime,
});

const SUMMARY: StatsSummary = {
  current: metrics(71, 30_000),
  previous: metrics(69, 46_000),
};

describe('headlineLines', () => {
  it('breaks the headline after its comma and ends it', () => {
    expect(headlineLines('Fewer hours, more series')).toEqual([
      'Fewer hours,',
      'more series.',
    ]);
  });

  it('is null without a headline', () => {
    expect(headlineLines(null)).toBeNull();
  });
});

describe('wallShows', () => {
  it('takes the top 10 by hours, most first', () => {
    const shows = Array.from({ length: 12 }, (_, index) =>
      show(index + 1, `Show ${index + 1}`, (index + 1) * 60),
    );
    const top = wallShows(shows);
    expect(top.map((item) => item.id)).toEqual([
      12, 11, 10, 9, 8, 7, 6, 5, 4, 3,
    ]);
  });

  it('breaks a tie in hours by episodes', () => {
    const a = { ...show(1, 'A', 600), episodes: 10 };
    const b = { ...show(2, 'B', 600), episodes: 12 };
    const c = show(3, 'C', 60);
    expect(wallShows([a, b, c]).map((item) => item.id)).toEqual([2, 1, 3]);
  });

  it('has no wall under 3 shows', () => {
    expect(wallShows([show(1, 'A', 600), show(2, 'B', 300)])).toEqual([]);
  });
});

describe('blameShow', () => {
  const traitors = show(1, 'The Traitors', 2160, { 0: 8, 1: 9, 6: 4 });
  const billions = show(2, 'Billions', 1440, { 3: 5, 7: 30 });

  it('is the show with the most episodes in the streak’s weeks', () => {
    expect(blameShow([billions, traitors], 0, 6)?.title).toBe('The Traitors');
    expect(blameShow([billions, traitors], 3, 7)?.title).toBe('Billions');
  });

  it('is null when nothing was watched in those weeks', () => {
    expect(blameShow([traitors], 20, 30)).toBeNull();
  });
});

describe('cardStreak', () => {
  const traitors = show(1, 'The Traitors', 2160, { 0: 8, 6: 4 });

  it('brackets the streak’s weeks and blames the show (2025: Jan 4 – Feb 14)', () => {
    expect(
      cardStreak({ days: 42, from: '2025-01-04', to: '2025-02-14' }, 2025, [
        traitors,
      ]),
    ).toEqual({
      first: 0,
      last: 6,
      line: '42 days in a row. Blame The Traitors.',
    });
  });

  it('keeps a title’s own end mark', () => {
    const whatIf = show(2, 'What If...?', 600, { 10: 3 });
    expect(
      cardStreak({ days: 3, from: '2025-03-12', to: '2025-03-14' }, 2025, [
        whatIf,
      ])?.line,
    ).toBe('3 days in a row. Blame What If...?');
  });

  it('says only the streak when no show is to blame', () => {
    expect(
      cardStreak({ days: 3, from: '2025-03-12', to: '2025-03-14' }, 2025, [])
        ?.line,
    ).toBe('3 days in a row.');
  });

  it('has no bracket for a one-day streak or none', () => {
    expect(
      cardStreak({ days: 1, from: '2025-03-12', to: '2025-03-12' }, 2025, []),
    ).toBeNull();
    expect(cardStreak(null, 2025, [])).toBeNull();
  });
});

describe('mostShowsYet', () => {
  it('needs more shows than every other year', () => {
    expect(mostShowsYet(71, [69, 34])).toBe(true);
    expect(mostShowsYet(69, [71])).toBe(false);
    expect(mostShowsYet(71, [71])).toBe(false);
  });

  it('is not claimed without another year', () => {
    expect(mostShowsYet(71, [])).toBe(false);
  });
});

describe('buildCardModel', () => {
  const shows = [
    show(1, 'The Traitors', 2160, { 0: 8, 6: 4 }),
    show(2, 'Billions', 1440),
    show(3, 'Barry', 960),
  ];

  it("says the board's card for 2025", () => {
    const model = buildCardModel({
      otherShowCounts: [69, 34],
      shows,
      streak: { days: 42, from: '2025-01-04', to: '2025-02-14' },
      summary: SUMMARY,
      username: 'nina',
      weeks: weeksWith({ 0: 8 }),
      year: 2025,
    });
    expect(model).toMatchObject({
      episodes: '615',
      episodesLabel: 'episodes',
      headline: ['Fewer hours,', 'more series.'],
      runtime: '2w 6d 20h',
      shows: '71',
      showsLabel: 'series, the most yet',
      streak: { line: '42 days in a row. Blame The Traitors.' },
      topHours: '36h',
      username: 'nina',
      year: 2025,
    });
    expect(model.top.map((item) => item.title)).toEqual([
      'The Traitors',
      'Billions',
      'Barry',
    ]);
  });

  it('has no headline in the first year and no wall with 2 shows', () => {
    const model = buildCardModel({
      otherShowCounts: [],
      shows: shows.slice(0, 2),
      streak: null,
      summary: { ...SUMMARY, previous: { ...metrics(0, 0), episodeCount: 0 } },
      username: 'nina',
      weeks: weeksWith({}),
      year: 2024,
    });
    expect(model.headline).toBeNull();
    expect(model.top).toEqual([]);
    expect(model.topHours).toBeNull();
    expect(model.showsLabel).toBe('series');
  });
});

describe('cardDescription', () => {
  const base = buildCardModel({
    otherShowCounts: [69],
    shows: [
      show(1, 'The Traitors', 2160, { 0: 8 }),
      show(2, 'Billions', 1440),
      show(3, 'Barry', 960),
      show(4, 'The Pitt', 840),
      show(5, 'Mocro Maffia', 720),
      show(6, 'The Morning Show', 600),
      show(7, 'MobLand', 540),
    ],
    streak: { days: 42, from: '2025-01-04', to: '2025-02-14' },
    summary: SUMMARY,
    username: 'nina',
    weeks: weeksWith({ 0: 8 }),
    year: 2025,
  });

  it('says the card in words, as the board labels it', () => {
    expect(cardDescription(base)).toBe(
      'nina’s 2025 on tvseri.es. Fewer hours, more series. A wall of the year’s top series, sized by hours: The Traitors (36h), Billions, Barry, The Pitt, Mocro Maffia, The Morning Show and more. Episodes per week across the year. 42 days in a row. Blame The Traitors. 2w 6d 20h of TV, 615 episodes, 71 series.',
    );
  });

  it('leaves out what the card leaves out', () => {
    expect(
      cardDescription({ ...base, headline: null, streak: null, top: [] }),
    ).toBe(
      'nina’s 2025 on tvseri.es. Episodes per week across the year. 2w 6d 20h of TV, 615 episodes, 71 series.',
    );
  });

  it('names a short wall in full', () => {
    expect(cardDescription({ ...base, top: base.top.slice(0, 3) })).toContain(
      'The Traitors (36h), Billions and Barry.',
    );
  });
});
