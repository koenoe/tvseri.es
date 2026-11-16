import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { isUnavailable } from '@/lib/cache/unavailable';

const { apiFetch, cacheLife, cacheTag } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

vi.mock('next/cache', () => ({ cacheLife, cacheTag }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch,
}));

const { loadSeasonEpisodes, loadWallEpisodes } = await import('./loaders');

const episode = {
  airDate: '2022-06-23',
  description: 'Carmy takes over.',
  episodeNumber: 1,
  hasAired: true,
  id: 11,
  runtime: 30,
  seasonNumber: 1,
  stillImage: 's.jpg',
  stillPath: '/s.jpg',
  title: 'System',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('loadSeasonEpisodes', () => {
  it('reads the season once, trimmed to what the client parts read', async () => {
    apiFetch.mockResolvedValue({
      episodes: [episode],
      id: 1,
      seasonNumber: 1,
      title: 'Season 1',
    });
    await expect(loadSeasonEpisodes(7, 1)).resolves.toEqual({
      episodes: [
        {
          airDate: '2022-06-23',
          description: 'Carmy takes over.',
          episodeNumber: 1,
          hasAired: true,
          id: 11,
          runtime: 30,
          seasonNumber: 1,
          stillImage: 's.jpg',
          title: 'System',
        },
      ],
      seasonNumber: 1,
    });
    expect(apiFetch).toHaveBeenCalledExactlyOnceWith(
      '/series/:id/season/:season',
      { notFound: 'null', params: { id: 7, season: 1 } },
    );
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('short');
    expect(cacheTag).toHaveBeenCalledWith('series:7');
  });

  it('is null for a season the API does not know', async () => {
    apiFetch.mockResolvedValue(null);
    await expect(loadSeasonEpisodes(7, 9)).resolves.toBeNull();
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('short');
  });

  it('answers an outage with Unavailable, cached briefly', async () => {
    apiFetch.mockRejectedValue(new ApiError(503));
    expect(isUnavailable(await loadSeasonEpisodes(7, 1))).toBe(true);
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('unavailable');
  });
});

describe('loadWallEpisodes', () => {
  it('draws a season the API does not know as an empty one', async () => {
    apiFetch.mockResolvedValue(null);
    await expect(loadWallEpisodes(7, 9)).resolves.toEqual({
      episodes: [],
      seasonNumber: 9,
    });
  });

  it('is null when the read failed (the wall shows its error)', async () => {
    apiFetch.mockRejectedValue(new ApiError(0, 'ApiTimeout'));
    await expect(loadWallEpisodes(7, 1)).resolves.toBeNull();
  });
});
