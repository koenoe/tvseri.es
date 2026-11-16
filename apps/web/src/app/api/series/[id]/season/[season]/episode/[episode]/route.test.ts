import type { EpisodeWithCredits, Person } from '@tvseri.es/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CACHE_HEADERS } from '@/app/api/cacheHeaders';
import {
  loadEpisodeWithCredits,
  loadSeriesCredits,
} from '@/lib/series/loaders';

import { GET } from './route';

vi.mock('@/lib/series/loaders', () => ({
  loadEpisodeWithCredits: vi.fn(),
  loadSeriesCredits: vi.fn(),
}));

const EPISODE: EpisodeWithCredits = {
  airDate: '2023-06-22',
  credits: {
    crew: [
      {
        character: '',
        id: 1,
        image: '',
        job: 'Director',
        name: 'Dee Director',
      },
      { character: '', id: 9, image: '', job: 'Gaffer', name: 'Gus Gaffer' },
    ],
    guestStars: [
      {
        character: 'Donna',
        id: 2,
        image: 'g.jpg',
        job: '',
        name: 'Gina Guest',
      },
    ],
  },
  description: 'Feast of the Seven Fishes.',
  episodeNumber: 6,
  hasAired: true,
  id: 100,
  runtime: 67,
  seasonNumber: 2,
  stillImage: 's.jpg',
  stillPath: '/s.jpg',
  title: 'Fishes',
};

const REGULAR: Person = {
  character: 'Carmy',
  id: 3,
  image: 'r.jpg',
  job: '',
  name: 'Rae Regular',
  numberOfEpisodes: 28,
  slug: 'rae-regular',
};

const get = (id: string, season: string, episode: string) =>
  GET(
    new Request(
      `https://www.tvseri.es/api/series/${id}/season/${season}/episode/${episode}`,
    ),
    { params: Promise.resolve({ episode, id, season }) },
  );

describe('GET /api/series/:id/season/:season/episode/:episode', () => {
  beforeEach(() => {
    vi.mocked(loadEpisodeWithCredits).mockReset();
    vi.mocked(loadSeriesCredits).mockReset();
  });

  it('answers the trimmed credits with the show’s regulars', async () => {
    vi.mocked(loadEpisodeWithCredits).mockResolvedValue(EPISODE);
    vi.mocked(loadSeriesCredits).mockResolvedValue({ cast: [REGULAR] });

    const res = await get('136315', '2', '6');

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe(CACHE_HEADERS.short);
    expect(await res.json()).toEqual({
      crew: [
        { people: [{ id: 1, name: 'Dee Director' }], role: 'Directed by' },
      ],
      guestStars: [
        { character: 'Donna', id: 2, image: 'g.jpg', name: 'Gina Guest' },
      ],
      starring: [
        { character: 'Carmy', id: 3, image: 'r.jpg', name: 'Rae Regular' },
      ],
    });
    expect(loadEpisodeWithCredits).toHaveBeenCalledWith(136315, 2, 6);
  });

  it('still answers without the regulars, but doesn’t store that', async () => {
    vi.mocked(loadEpisodeWithCredits).mockResolvedValue(EPISODE);
    vi.mocked(loadSeriesCredits).mockRejectedValue(new Error('down'));

    const res = await get('136315', '2', '6');

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect((await res.json()).starring).toEqual([]);
  });

  it('404s an unknown episode', async () => {
    vi.mocked(loadEpisodeWithCredits).mockResolvedValue(null);
    vi.mocked(loadSeriesCredits).mockResolvedValue(null);

    const res = await get('136315', '2', '60');

    expect(res.status).toBe(404);
  });

  it.each([
    ['x', '1', '1'],
    ['136315', '1a', '1'],
    ['136315', '1', '12345'],
  ])(
    '404s invalid params (%s, %s, %s) without a call',
    async (id, season, episode) => {
      const res = await get(id, season, episode);

      expect(res.status).toBe(404);
      expect(loadEpisodeWithCredits).not.toHaveBeenCalled();
    },
  );

  it('answers 502 when the API fails', async () => {
    vi.mocked(loadEpisodeWithCredits).mockRejectedValue(new Error('down'));
    vi.mocked(loadSeriesCredits).mockResolvedValue(null);

    const res = await get('136315', '2', '6');

    expect(res.status).toBe(502);
  });
});
