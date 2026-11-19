import type { Season, TvSeries } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { toSeasonInfo } from '@/lib/marking/seasonInfo';

import { toShowSummary } from './show';

const season = (seasonNumber: number, episodes: number): Season => ({
  airDate: '2020-06-01T00:00:00.000Z',
  description: '',
  episodes: [],
  hasAired: true,
  id: seasonNumber,
  numberOfAiredEpisodes: episodes,
  numberOfEpisodes: episodes,
  seasonNumber,
  title: seasonNumber === 0 ? 'Specials' : `Season ${seasonNumber}`,
});

const series = (specials?: Season) =>
  ({
    backdropImage: '',
    id: 1,
    nextEpisodeToAir: null,
    seasons: [season(1, 8), season(2, 10)],
    slug: 'show',
    status: 'Ended',
    title: 'Show',
    ...(specials && { specials }),
  }) as unknown as TvSeries;

describe('a show with specials', () => {
  it('lists them last, as season 0, in the page summary and the marking seasons', () => {
    const withSpecials = series(season(0, 3));
    expect(
      toShowSummary(withSpecials).seasons.map((item) => [
        item.seasonNumber,
        item.title,
        item.episodeCount,
        item.airDate,
      ]),
    ).toEqual([
      [1, 'Season 1', 8, '2020-06-01T00:00:00.000Z'],
      [2, 'Season 2', 10, '2020-06-01T00:00:00.000Z'],
      [0, 'Specials', 3, '2020-06-01T00:00:00.000Z'],
    ]);
    expect(toSeasonInfo(withSpecials)).toEqual([
      { airedEpisodeCount: 8, episodeCount: 8, seasonNumber: 1 },
      { airedEpisodeCount: 10, episodeCount: 10, seasonNumber: 2 },
      { airedEpisodeCount: 3, episodeCount: 3, seasonNumber: 0 },
    ]);
  });

  it('has regular seasons only without them', () => {
    expect(
      toShowSummary(series()).seasons.map((item) => item.seasonNumber),
    ).toEqual([1, 2]);
    expect(toSeasonInfo(series()).map((item) => item.seasonNumber)).toEqual([
      1, 2,
    ]);
  });
});

describe('a show TMDB numbers on across seasons', () => {
  it('keeps each season’s first episode number in the summary and the marking seasons', () => {
    const numberedOn = {
      ...series(),
      seasons: [season(1, 32), { ...season(2, 21), firstEpisodeNumber: 33 }],
    } as unknown as TvSeries;
    expect(
      toShowSummary(numberedOn).seasons.map((item) => item.firstEpisodeNumber),
    ).toEqual([undefined, 33]);
    expect(toSeasonInfo(numberedOn)).toEqual([
      { airedEpisodeCount: 32, episodeCount: 32, seasonNumber: 1 },
      {
        airedEpisodeCount: 21,
        episodeCount: 21,
        firstEpisodeNumber: 33,
        seasonNumber: 2,
      },
    ]);
  });
});
