import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SeriesSeed } from '@/lib/marking/types';

const { loadSeasonEpisodes } = vi.hoisted(() => ({
  loadSeasonEpisodes: vi.fn(),
}));

vi.mock('./loaders', () => ({ loadSeasonEpisodes }));

const { loadRemoteEpisodes } = await import('./remoteEpisodes');

const seed = (watched: SeriesSeed['watched'] = []): SeriesSeed => ({
  seasons: [
    { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 1 },
    { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 2 },
  ],
  seriesId: 7,
  status: null,
  watched,
});

const episode = (episodeNumber: number, stillImage: string) => ({
  airDate: '2022-06-23',
  description: '',
  episodeNumber,
  hasAired: true,
  id: episodeNumber,
  runtime: 30,
  seasonNumber: 2,
  stillImage,
  title: `Episode ${episodeNumber}`,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('loadRemoteEpisodes', () => {
  it("reads Next up's season from the wall's cached loader", async () => {
    loadSeasonEpisodes.mockResolvedValue({
      episodes: [episode(1, 's.jpg'), episode(2, '')],
      seasonNumber: 2,
    });
    const watched = [1, 2].map((episodeNumber) => ({
      episodeNumber,
      seasonNumber: 1,
      watchedAt: 1,
    }));
    await expect(loadRemoteEpisodes(seed(watched))).resolves.toEqual([
      { episodeNumber: 1, seasonNumber: 2, still: 's.jpg', title: 'Episode 1' },
      { episodeNumber: 2, seasonNumber: 2, still: null, title: 'Episode 2' },
    ]);
    expect(loadSeasonEpisodes).toHaveBeenCalledExactlyOnceWith(7, 2);
  });

  it('is empty when the season is unknown or its read failed', async () => {
    loadSeasonEpisodes.mockResolvedValueOnce(null);
    await expect(loadRemoteEpisodes(seed())).resolves.toEqual([]);
    loadSeasonEpisodes.mockResolvedValueOnce({ unavailable: true });
    await expect(loadRemoteEpisodes(seed())).resolves.toEqual([]);
  });
});
