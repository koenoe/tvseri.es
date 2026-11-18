import type { TmdbTvSeries } from '@tvseri.es/schemas';
import { describe, expect, it, vi } from 'vitest';

import { normalizeTvSeries } from './helpers';

const season = (seasonNumber: number, airDate: string, episodes = 12) => ({
  air_date: airDate,
  episode_count: episodes,
  id: seasonNumber,
  name: `Season ${seasonNumber}`,
  overview: '',
  season_number: seasonNumber,
});

const episode = (
  seasonNumber: number,
  episodeNumber: number,
  airDate: string,
) => ({
  air_date: airDate,
  episode_number: episodeNumber,
  id: seasonNumber * 100 + episodeNumber,
  name: 'Episode',
  season_number: seasonNumber,
});

/** An ended show: specials, then three seasons of 12 */
const show = (overrides: Record<string, unknown>) =>
  ({
    first_air_date: '2013-09-12',
    id: 1,
    last_air_date: '2022-04-03',
    name: 'Show',
    seasons: [
      season(0, '2014-01-01', 4),
      season(1, '2013-09-12'),
      season(2, '2014-10-02'),
      season(3, '2016-05-05'),
    ],
    status: 'Ended',
    ...overrides,
  }) as unknown as TmdbTvSeries;

// What the watched stream and the nightly job finish a show by
describe('normalizeTvSeries: the aired count of an ended show', () => {
  vi.useFakeTimers({ now: Date.parse('2026-11-13'), toFake: ['Date'] });

  it('counts every regular episode when TMDB’s last aired episode is right', () => {
    const series = normalizeTvSeries(
      show({ last_episode_to_air: episode(3, 12, '2016-07-21') }),
    );
    expect(series.numberOfAiredEpisodes).toBe(36);
  });

  it('is not undercounted by a special as the last aired episode', () => {
    const series = normalizeTvSeries(
      show({ last_episode_to_air: episode(0, 4, '2025-12-01') }),
    );
    expect(series.numberOfAiredEpisodes).toBe(36);
  });

  it('is not undercounted by a last aired episode in an early season', () => {
    const series = normalizeTvSeries(
      show({ last_episode_to_air: episode(2, 12, '2023-01-01') }),
    );
    expect(series.numberOfAiredEpisodes).toBe(36);
  });

  it('is not undercounted without a last aired episode', () => {
    const series = normalizeTvSeries(show({ last_episode_to_air: null }));
    expect(series.numberOfAiredEpisodes).toBe(36);
  });
});

describe('normalizeTvSeries: specials beside the shared aired rule', () => {
  it('a special as the last aired episode keeps the regular count and counts the specials', () => {
    const series = normalizeTvSeries(
      show({ last_episode_to_air: episode(0, 4, '2025-12-01') }),
    );
    expect(series.seasons?.map((s) => s.numberOfAiredEpisodes)).toEqual([
      12, 12, 12,
    ]);
    expect(series.specials?.numberOfAiredEpisodes).toBe(4);
  });

  it('a returning show mid-season whose last aired episode is a special: the season counts up to its next episode', () => {
    const series = normalizeTvSeries(
      show({
        last_episode_to_air: episode(0, 3, '2026-11-01'),
        next_episode_to_air: episode(3, 6, '2026-11-20'),
        seasons: [
          season(0, '2014-01-01', 4),
          season(1, '2013-09-12'),
          season(2, '2014-10-02'),
          season(3, '2026-10-01'),
        ],
        status: 'Returning Series',
      }),
    );
    expect(series.seasons?.map((s) => s.numberOfAiredEpisodes)).toEqual([
      12, 12, 5,
    ]);
    expect(series.numberOfAiredEpisodes).toBe(29);
  });

  it('specials before the next one to air are the aired ones', () => {
    const series = normalizeTvSeries(
      show({
        last_episode_to_air: episode(3, 12, '2016-07-21'),
        next_episode_to_air: episode(0, 3, '2026-12-24'),
        status: 'Returning Series',
      }),
    );
    expect(series.specials?.numberOfAiredEpisodes).toBe(2);
    expect(series.numberOfAiredEpisodes).toBe(36);
  });
});
