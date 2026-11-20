import type { TvSeries } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { pickMeta, pickWhy } from './pickWhy';

const TODAY = '2026-11-11';

const episode = (
  seasonNumber: number,
  episodeNumber: number,
  airDate: string,
) => ({
  airDate,
  description: '',
  episodeNumber,
  hasAired: false,
  id: seasonNumber * 1000 + episodeNumber,
  runtime: 0,
  seasonNumber,
  stillImage: '',
  stillPath: '',
  title: '',
});

const show = (fields: Partial<TvSeries>) =>
  ({
    firstAirDate: '2018-01-01',
    genres: [],
    lastEpisodeToAir: null,
    nextEpisodeToAir: null,
    numberOfEpisodes: 10,
    numberOfSeasons: 1,
    releaseYear: '2018',
    status: 'Returning Series',
    voteAverage: 8,
    ...fields,
  }) as TvSeries;

describe('pickWhy', () => {
  it('names a season that starts tonight', () => {
    const mocro = show({
      nextEpisodeToAir: episode(7, 1, '2026-11-11'),
      numberOfEpisodes: 60,
      numberOfSeasons: 7,
    });
    expect(pickWhy(mocro, TODAY)).toBe('Season 7 premieres tonight');
  });

  it('names a season that starts tomorrow or later this week', () => {
    const tomorrow = show({
      nextEpisodeToAir: episode(2, 1, '2026-11-12'),
      numberOfSeasons: 2,
    });
    const saturday = show({
      nextEpisodeToAir: episode(2, 1, '2026-11-14'),
      numberOfSeasons: 2,
    });
    expect(pickWhy(tomorrow, TODAY)).toBe('Season 2 premieres tomorrow');
    expect(pickWhy(saturday, TODAY)).toBe('Season 2 premieres Saturday');
  });

  it('names the premiere of a season TMDB numbers on from the last', () => {
    // S2 is E33…E53: E33 opens it
    const naruto = show({
      nextEpisodeToAir: episode(2, 33, '2026-11-12'),
      numberOfSeasons: 2,
      seasons: [
        { firstEpisodeNumber: 33, seasonNumber: 2 },
      ] as unknown as TvSeries['seasons'],
    });
    expect(pickWhy(naruto, TODAY)).toBe('Season 2 premieres tomorrow');
  });

  it('does not count a premiere more than a week away, or a mid-season episode', () => {
    const later = show({
      nextEpisodeToAir: episode(2, 1, '2026-11-30'),
      numberOfEpisodes: 8,
      numberOfSeasons: 2,
      status: 'Ended',
    });
    const midSeason = show({
      nextEpisodeToAir: episode(2, 4, '2026-11-11'),
      numberOfEpisodes: 8,
      numberOfSeasons: 2,
      status: 'Ended',
    });
    expect(pickWhy(later, TODAY)).toBe('2 seasons, 8 episodes');
    expect(pickWhy(midSeason, TODAY)).toBe('2 seasons, 8 episodes');
  });

  it('calls a first season from the last twelve months new', () => {
    const studio = show({
      firstAirDate: '2025-11-26',
      numberOfEpisodes: 10,
      releaseYear: '2025',
    });
    expect(pickWhy(studio, TODAY)).toBe('New this year: 10 episodes');
  });

  it('calls a finished one-season show complete', () => {
    const blackRabbit = show({
      firstAirDate: '2025-01-01',
      numberOfEpisodes: 8,
      status: 'Ended',
    });
    expect(pickWhy(blackRabbit, TODAY)).toBe('Complete: 8 episodes');
  });

  it('praises a short ended show rated 8.5 or more', () => {
    const fleabag = show({
      numberOfEpisodes: 12,
      numberOfSeasons: 2,
      status: 'Ended',
      voteAverage: 8.6,
    });
    expect(pickWhy(fleabag, TODAY)).toBe('Two perfect seasons, 12 episodes');
    expect(pickWhy({ ...fleabag, numberOfSeasons: 3 }, TODAY)).toBe(
      'Three perfect seasons, 12 episodes',
    );
  });

  it('sums up any other ended show', () => {
    const lineOfDuty = show({
      numberOfEpisodes: 36,
      numberOfSeasons: 6,
      status: 'Canceled',
      voteAverage: 8.2,
    });
    expect(pickWhy(lineOfDuty, TODAY)).toBe('Ended: 6 seasons, 36 episodes');
  });

  it('calls a cancelled show complete only once nothing is left to air', () => {
    const airingOut = show({
      nextEpisodeToAir: episode(1, 6, '2026-11-20'),
      numberOfEpisodes: 8,
      status: 'Canceled',
    });
    expect(pickWhy(airingOut, TODAY)).toBe('1 season, 8 episodes');
    expect(pickWhy({ ...airingOut, nextEpisodeToAir: null }, TODAY)).toBe(
      'Complete: 8 episodes',
    );
  });

  it('never says a cancelled show still airing is still going', () => {
    const lastSeason = show({
      nextEpisodeToAir: episode(6, 4, '2026-11-20'),
      numberOfEpisodes: 36,
      numberOfSeasons: 6,
      status: 'Canceled',
    });
    expect(pickWhy(lastSeason, TODAY)).toBe('6 seasons, 36 episodes');
  });

  it('names the latest season when it finished in the last twelve months', () => {
    const shrinking = show({
      lastEpisodeToAir: episode(3, 11, '2026-04-08'),
      numberOfEpisodes: 34,
      numberOfSeasons: 3,
    });
    expect(pickWhy(shrinking, TODAY)).toBe('Season 3 is out: 11 episodes');
  });

  it('keeps quiet about a latest season that is still airing', () => {
    const airing = show({
      lastEpisodeToAir: episode(3, 4, '2026-11-04'),
      nextEpisodeToAir: episode(3, 5, '2026-11-18'),
      numberOfEpisodes: 24,
      numberOfSeasons: 3,
    });
    expect(pickWhy(airing, TODAY)).toBe('3 seasons, 24 episodes');
  });

  it('notes five or more seasons of a running show', () => {
    const rookie = show({
      lastEpisodeToAir: episode(7, 18, '2025-04-29'),
      numberOfEpisodes: 130,
      numberOfSeasons: 7,
    });
    expect(pickWhy(rookie, TODAY)).toBe('7 seasons and still going');
  });

  it('falls back to the size of the show', () => {
    expect(
      pickWhy(show({ numberOfEpisodes: 1, numberOfSeasons: 1 }), TODAY),
    ).toBe('1 season, 1 episode');
  });
});

describe('pickMeta', () => {
  it('is the year, the seasons and the first genre', () => {
    expect(
      pickMeta(
        show({
          genres: [{ id: 35, name: 'Comedy', slug: 'comedy' }],
          numberOfSeasons: 3,
          releaseYear: '2023',
        }),
      ),
    ).toEqual({ genre: 'Comedy', seasons: '3 seasons', year: '2023' });
    expect(pickMeta(show({ numberOfSeasons: 1 }))).toEqual({
      genre: '',
      seasons: '1 season',
      year: '2018',
    });
  });
});
