import { cacheLife } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { isUnavailable } from '@/lib/cache/unavailable';

import { UNAVAILABLE } from '../../_discover/data/testing/loaders';

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
const { getLensPanels, getLensRow, LENS_ROWS } = await import('./lenses');
const { getWeekendShows } = await import('./weekend');
const { getAllTimeFavourites } = await import('./rows');

describe('hub data when the API fails', () => {
  it('gives the Duration lens, its rows and the shelves Unavailable', async () => {
    apiFetch.mockRejectedValue(new ApiError(503));
    const panels = await getLensPanels();
    expect(panels.duration).toEqual(UNAVAILABLE);
    await expect(getLensRow(LENS_ROWS[0]?.key ?? '')).resolves.toEqual(
      UNAVAILABLE,
    );
    await expect(getWeekendShows()).resolves.toEqual(UNAVAILABLE);
    await expect(getAllTimeFavourites()).resolves.toEqual(UNAVAILABLE);
  });

  it('keeps the other lenses: their art is stored, only counts are read', async () => {
    apiFetch.mockRejectedValue(new ApiError(503));
    const panels = await getLensPanels();
    for (const lens of ['country', 'decade', 'language', 'network', 'theme']) {
      const tiles = panels[lens as keyof typeof panels];
      expect(Array.isArray(tiles) ? tiles : []).toHaveLength(5);
    }
    expect(Array.isArray(panels.country) && panels.country[0]).toMatchObject({
      line: '',
      look: { image: expect.stringContaining('image.tmdb.org') },
    });
    const paths = apiFetch.mock.calls.map(([path]) => path);
    expect(paths).not.toContain('/series/:id');
    // without the network's logo its tile keeps the name
    expect(
      Array.isArray(panels.network) &&
        panels.network.map((tile) => tile.wordmark),
    ).toEqual([undefined, undefined, undefined, undefined, undefined]);
  });

  it('gives a network tile its logo as the wordmark, read with the tiles', async () => {
    apiFetch.mockImplementation(
      (path: string, options?: Readonly<{ params?: { id?: number } }>) =>
        path === '/network/:id'
          ? Promise.resolve({
              id: options?.params?.id,
              // HBO (49) has a logo; the others none
              logo:
                options?.params?.id === 49
                  ? 'https://image.tmdb.org/t/p/w500/hbo.png'
                  : null,
              name: 'Network',
              originCountry: null,
            })
          : Promise.reject(new ApiError(503)),
    );
    // the logo's file can't be read: a typical wordmark's ratio
    const fetchLogo = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('offline'));
    const panels = await getLensPanels();
    fetchLogo.mockRestore();
    expect(
      Array.isArray(panels.network) &&
        panels.network.map((tile) => [tile.name, tile.wordmark]),
    ).toEqual([
      ['Apple TV', undefined],
      [
        'HBO',
        {
          ratio: 4,
          silhouette: true,
          src: 'https://image.tmdb.org/t/p/w500/hbo.png',
        },
      ],
      ['Netflix', undefined],
      ['BBC One', undefined],
      ['All networks', undefined],
    ]);
  });

  it('leaves the show its Duration tile draws out of the tile’s row', async () => {
    const show = (id: number, backdrop = '') => ({
      backdropImage: backdrop,
      id,
      network: null,
      numberOfEpisodes: 5,
      numberOfSeasons: 1,
      posterImage: `p${id}.jpg`,
      slug: `s${id}`,
      title: `Show ${id}`,
      totalMinutes: 300,
      year: 2020,
    });
    apiFetch.mockImplementation((path: string) =>
      Promise.resolve(
        path === '/duration'
          ? {
              tiles: [
                {
                  bucket: 'under-6-hours',
                  count: 1104,
                  exact: true,
                  listed: 4,
                  preview: [show(1), show(2, 'b2.jpg'), show(3, 'b3.jpg')],
                },
              ],
            }
          : {
              items: [show(2, 'b2.jpg'), show(4), show(5), show(6)],
              nextPage: null,
            },
      ),
    );
    const view = await getLensRow('duration-under-6-hours');
    expect(view && !isUnavailable(view) && view.items.map((s) => s.id)).toEqual(
      [4, 5, 6],
    );
  });

  it('keeps the drawn show when leaving it out would leave under three, and opens a list of one empty', async () => {
    const show = (id: number) => ({
      backdropImage: id === 2 ? 'b2.jpg' : '',
      id,
      network: null,
      numberOfEpisodes: 5,
      numberOfSeasons: 1,
      posterImage: `p${id}.jpg`,
      slug: `s${id}`,
      title: `Show ${id}`,
      totalMinutes: 300,
      year: 2020,
    });
    const answer = (items: ReadonlyArray<number>) => (path: string) =>
      Promise.resolve(
        path === '/duration'
          ? {
              tiles: [
                {
                  bucket: 'under-6-hours',
                  count: 1104,
                  exact: true,
                  listed: items.length,
                  preview: [show(2)],
                },
              ],
            }
          : { items: items.map(show), nextPage: null },
      );
    const ids = async () => {
      const view = await getLensRow('duration-under-6-hours');
      return view && !isUnavailable(view) && view.items.map((s) => s.id);
    };

    apiFetch.mockImplementation(answer([2, 4, 5]));
    expect(await ids()).toEqual([2, 4, 5]);
    apiFetch.mockImplementation(answer([4]));
    expect(await ids()).toEqual([]);
  });

  const weekendShow = (id: number) => ({
    backdropImage: '',
    id,
    network: null,
    numberOfEpisodes: 6,
    numberOfSeasons: 1,
    posterImage: '',
    slug: `show-${id}`,
    title: `Show ${id}`,
    totalMinutes: 300,
    year: 2020,
  });

  it('keeps the weekend row when only Go deeper is unavailable', async () => {
    apiFetch.mockImplementation((path: string) =>
      path === '/duration/weekend'
        ? Promise.resolve({ items: [1, 2, 3].map(weekendShow) })
        : Promise.reject(new ApiError(503)),
    );
    await expect(getWeekendShows()).resolves.toMatchObject([
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ]);
  });

  it('leaves the Under 6 hours tile’s backdrop show out of the weekend row', async () => {
    apiFetch.mockImplementation((path: string) => {
      if (path === '/duration/weekend') {
        return Promise.resolve({ items: [1, 2, 3, 4].map(weekendShow) });
      }
      if (path === '/duration') {
        return Promise.resolve({
          tiles: [
            {
              bucket: 'under-6-hours',
              count: 1104,
              exact: true,
              preview: [
                weekendShow(9),
                { ...weekendShow(1), backdropImage: 'b1.jpg' },
              ],
            },
          ],
        });
      }
      return Promise.reject(new ApiError(503));
    });
    await expect(getWeekendShows()).resolves.toMatchObject([
      { id: 2 },
      { id: 3 },
      { id: 4 },
    ]);
  });

  it('ranks the owner’s list for All-time favourites from one cached read', async () => {
    const listed = (id: number) => ({
      firstAirDate: '2008-01-20',
      id,
      posterImage: id === 2 ? '' : `p${id}.jpg`,
      slug: `show-${id}`,
      title: `Show ${id}`,
    });
    apiFetch.mockImplementation((path: string) =>
      path === '/collection/top-rated'
        ? Promise.resolve([1, 2, 3, 4].map(listed))
        : Promise.reject(new ApiError(503)),
    );
    await expect(getAllTimeFavourites()).resolves.toMatchObject([
      { id: 1, rank: 1 },
      { id: 3, rank: 2 },
      { id: 4, rank: 3 },
    ]);
    expect(apiFetch.mock.calls.map(([path]) => path)).toEqual([
      '/collection/top-rated',
    ]);
  });

  it('keeps All-time favourites’ shows out of the weekend row (a rank can’t skip)', async () => {
    apiFetch.mockImplementation((path: string) => {
      if (path === '/duration/weekend') {
        return Promise.resolve({ items: [1, 2, 3, 4, 5].map(weekendShow) });
      }
      if (path === '/collection/top-rated') {
        return Promise.resolve(
          [2, 7, 8].map((id) => ({
            id,
            posterImage: `p${id}.jpg`,
            slug: `show-${id}`,
            title: `Show ${id}`,
          })),
        );
      }
      return Promise.reject(new ApiError(503));
    });
    await expect(getWeekendShows()).resolves.toMatchObject([
      { id: 1 },
      { id: 3 },
      { id: 4 },
      { id: 5 },
    ]);
  });

  it('leaves the weekend row out under three shows', async () => {
    apiFetch.mockImplementation((path: string) =>
      path === '/duration/weekend'
        ? Promise.resolve({ items: [1, 2].map(weekendShow) })
        : Promise.reject(new ApiError(503)),
    );
    await expect(getWeekendShows()).resolves.toEqual([]);
  });
});
