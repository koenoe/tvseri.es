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

const { loadCast, loadSeasonEpisodes, loadWallEpisodes } = await import(
  './loaders'
);

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

const person = (id: number, character = '') => ({
  character,
  id,
  image: `${id}.jpg`,
  job: '',
  name: `Person ${id}`,
  numberOfEpisodes: 1,
  slug: `person-${id}`,
});

describe('loadCast', () => {
  it('draws ten faces, five of the cast with a photo in the stack, and counts everyone once', async () => {
    const cast = Array.from({ length: 14 }, (_, index) =>
      person(index + 2, `Role ${index + 2}`),
    );
    // no photo: skipped in the stack, still counted
    cast[1] = { ...person(3, 'Role 3'), image: '' };
    // the creator acts too: one person
    cast.push(person(1, 'Himself'));
    apiFetch.mockResolvedValue({ cast, crew: [] });

    const result = await loadCast(7, [person(1)]);
    if (isUnavailable(result)) {
      throw new Error('expected the cast');
    }

    expect(result.faces).toHaveLength(10);
    expect(result.faces[0]).toEqual({
      id: 2,
      image: '2.jpg',
      name: 'Person 2',
      role: 'Role 2',
      slug: 'person-2',
    });
    expect(result.stack.map((face) => face.role)).toEqual([
      'Role 2',
      'Role 4',
      'Role 5',
      'Role 6',
      'Role 7',
    ]);
    expect(result.castCount).toBe(15);
    expect(result.peopleCount).toBe(15);
  });

  it('counts the crew in everyone, but not in the cast’s "+N"', async () => {
    const crewRow = (id: number, department: string) => ({
      department,
      id,
      image: '',
      jobs: [{ episodes: 1, job: 'Director' }],
      name: `Person ${id}`,
      numberOfEpisodes: 1,
      slug: `person-${id}`,
    });
    apiFetch.mockResolvedValue({
      cast: [person(2, 'Role 2'), person(3, 'Role 3')],
      // the creator directs, and one director writes too: each once
      crew: [
        crewRow(1, 'Directing'),
        crewRow(9, 'Directing'),
        crewRow(9, 'Writing'),
      ],
    });

    const result = await loadCast(7, [person(1)]);
    if (isUnavailable(result)) {
      throw new Error('expected the cast');
    }

    expect(result.castCount).toBe(2);
    expect(result.peopleCount).toBe(4);
  });

  it('passes an outage on', async () => {
    apiFetch.mockRejectedValue(new ApiError(503, 'down'));

    expect(isUnavailable(await loadCast(7, []))).toBe(true);
  });
});
