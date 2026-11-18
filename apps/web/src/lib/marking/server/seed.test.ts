import type { TvSeries } from '@tvseri.es/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchProgress, fetchSeriesStatus } = vi.hoisted(() => ({
  fetchProgress: vi.fn(),
  fetchSeriesStatus: vi.fn(),
}));

vi.mock('./api', () => ({ fetchProgress, fetchSeriesStatus }));

const { readSeriesSeed } = await import('./seed');

const VIEWER = { accessToken: 'token', id: 'user-1' };
const SERIES = {
  id: 7,
  seasons: [
    {
      episodes: [],
      numberOfAiredEpisodes: 8,
      numberOfEpisodes: 8,
      seasonNumber: 1,
    },
  ],
} as unknown as TvSeries;
const WATCHED = [{ episodeNumber: 1, seasonNumber: 1, watchedAt: 5 }];
const STATUS = {
  isFavorited: false,
  isWatchlisted: true,
  prefs: { skipped: [] },
};

beforeEach(() => {
  vi.useFakeTimers({ now: 1_000 });
  fetchProgress.mockResolvedValue(WATCHED);
  fetchSeriesStatus.mockResolvedValue(STATUS);
});

describe('readSeriesSeed', () => {
  it('is the viewer’s seed: seasons, watched and status, timed before the reads', async () => {
    let resolveSeries: (value: TvSeries) => void = () => {};
    const series = new Promise<TvSeries>((resolve) => {
      resolveSeries = resolve;
    });
    const seed = readSeriesSeed(VIEWER, 7, series);
    // the viewer's reads don't wait for the show
    expect(fetchProgress).toHaveBeenCalledWith(
      { accessToken: 'token', userId: 'user-1' },
      7,
    );
    expect(fetchSeriesStatus).toHaveBeenCalledWith('token', 7);
    vi.setSystemTime(9_000);
    resolveSeries(SERIES);
    await expect(seed).resolves.toEqual({
      fetchedAt: 1_000,
      seasons: [{ airedEpisodeCount: 8, episodeCount: 8, seasonNumber: 1 }],
      seriesId: 7,
      status: STATUS,
      watched: WATCHED,
    });
    vi.useRealTimers();
  });

  it('takes a show already in hand', async () => {
    await expect(readSeriesSeed(VIEWER, 7, SERIES)).resolves.toMatchObject({
      seriesId: 7,
    });
    vi.useRealTimers();
  });

  it('is null for a show the API does not know', async () => {
    await expect(readSeriesSeed(VIEWER, 7, null)).resolves.toBeNull();
    vi.useRealTimers();
  });
});
