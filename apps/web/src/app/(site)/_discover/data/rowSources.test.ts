import { cacheLife } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';

import { discoverPage, UNAVAILABLE } from './loaderTesting';

const apiFetch = vi.fn();

vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));

beforeEach(() => {
  apiFetch.mockReset();
  vi.mocked(cacheLife).mockClear();
});

const {
  bestRated,
  chipTabs,
  discoverRowSource,
  discoverTabsSource,
  landingFactsOf,
  whereToStartSource,
} = await import('./rowSources');

const row = (...ids: number[]) =>
  ids.map((id) => ({
    id,
    poster: 'p.jpg',
    slug: `show-${id}`,
    title: `Show ${id}`,
  }));

/** A Where to start answer: one pick per slot, then a backup per slot */
const startAnswer = (picks: number[], backups: number[]) => {
  const show = (id: number) => ({
    ...discoverPage(id).items[0],
    numberOfEpisodes: 10,
    numberOfSeasons: 1,
    totalMinutes: 500,
    year: 2020,
  });
  const kinds = ['night', 'weekend', 'long-haul'];
  return {
    backups: backups.map((id, index) => ({
      kind: kinds[index],
      show: show(id),
      why: '',
    })),
    picks: picks.map((id, index) => ({
      kind: kinds[index],
      show: show(id),
      why: '',
    })),
  };
};

describe('bestRated', () => {
  it('sorts by rating above a vote floor', () => {
    expect(bestRated(300)).toEqual({
      sort_by: 'vote_average.desc',
      'vote_count.gte': '300',
    });
  });
});

describe('discoverRowSource', () => {
  it('sends the whole list as a row', async () => {
    apiFetch.mockResolvedValue(discoverPage(1, 2, 3));
    await expect(discoverRowSource('with_genres=80')).resolves.toEqual({
      kind: 'shows',
      shows: row(1, 2, 3),
    });
  });

  it('cuts the list to its first shows and says so in the limit', async () => {
    apiFetch.mockResolvedValue(discoverPage(1, 2, 3));
    await expect(
      discoverRowSource('with_genres=80', { first: 2 }),
    ).resolves.toEqual({ kind: 'shows', limit: 2, shows: row(1, 2) });
  });

  it('passes Unavailable on', async () => {
    apiFetch.mockRejectedValue(new ApiError(503));
    await expect(discoverRowSource('with_genres=80')).resolves.toEqual(
      UNAVAILABLE,
    );
  });
});

describe('discoverTabsSource', () => {
  it('gives each tab its own list, in the tabs’ order', async () => {
    apiFetch.mockImplementation(
      (_: string, { query }: { query: Record<string, string> }) =>
        Promise.resolve(
          query.with_keywords === '1' ? discoverPage(1, 2) : discoverPage(3),
        ),
    );
    await expect(
      discoverTabsSource('kind', [
        { key: 'heist', query: 'with_keywords=1' },
        { key: 'cop', query: 'with_keywords=2' },
      ]),
    ).resolves.toEqual({
      kind: 'tabs',
      switchId: 'kind',
      tabs: { cop: row(3), heist: row(1, 2) },
    });
  });

  it('is Unavailable when any tab’s read fails', async () => {
    apiFetch.mockImplementation(
      (_: string, { query }: { query: Record<string, string> }) =>
        query.with_keywords === '1'
          ? Promise.resolve(discoverPage(1))
          : Promise.reject(new ApiError(503)),
    );
    await expect(
      discoverTabsSource('kind', [
        { key: 'heist', query: 'with_keywords=1' },
        { key: 'cop', query: 'with_keywords=2' },
      ]),
    ).resolves.toEqual(UNAVAILABLE);
  });
});

describe('whereToStartSource', () => {
  it('fills a slot the row above draws from its backup', async () => {
    apiFetch.mockResolvedValue(startAnswer([1, 2, 3], [4, 5, 6]));
    const above = async () =>
      ({ kind: 'shows', limit: 1, shows: row(2, 7) }) as const;
    const source = await whereToStartSource('genre', 'crime', [above]);
    expect(source).toMatchObject({ kind: 'shows', limit: 3 });
    expect(
      'shows' in source ? source.shows.map((show) => show.id) : [],
    ).toEqual([1, 5, 3]);
  });

  it('passes Unavailable on', async () => {
    apiFetch.mockRejectedValue(new ApiError(503));
    await expect(whereToStartSource('country', 'gb')).resolves.toEqual(
      UNAVAILABLE,
    );
  });
});

describe('landingFactsOf', () => {
  it('gives the facts of the kind asked for', async () => {
    const facts = { byKind: [], count: 10, type: 'genre' };
    apiFetch.mockResolvedValue(facts);
    await expect(landingFactsOf('genre', 'crime')).resolves.toEqual(facts);
  });

  it('throws for a slug without facts of that kind', async () => {
    apiFetch.mockResolvedValue(null);
    await expect(landingFactsOf('genre', 'nope')).rejects.toThrow(
      'no genre facts for nope',
    );
  });
});

describe('chipTabs', () => {
  it('keys each tab by its chip’s slug', () => {
    expect(chipTabs([{ name: 'organized crime', slug: 'mafia' }])).toEqual([
      { key: 'mafia', name: 'organized crime' },
    ]);
  });
});
