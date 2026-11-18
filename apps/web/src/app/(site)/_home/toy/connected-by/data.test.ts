import type { ConnectedPath, LibraryIds, TvSeries } from '@tvseri.es/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetch, fetchLibraryIds } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  fetchLibraryIds: vi.fn(),
}));

vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('@/lib/api/client', () => ({
  apiFetch,
  isUpstreamFailure: () => false,
}));
vi.mock('@/lib/marking/server/api', () => ({ fetchLibraryIds }));

const { getViewerPaths } = await import('./data');

const DAY = '2026-11-17';
const SHARED_START = 1;
const OWN_START = 2;

const show = (id: number) =>
  ({ id, slug: `show-${id}`, title: `Show ${id}` }) as TvSeries;

const person = { characters: [], id: 9, image: '', name: 'P', slug: 'p' };

/** A two-step path from `start` through show 50 to `end` */
const path = (start: number, end: number): ConnectedPath => ({
  nodes: [
    { series: show(start), type: 'show' },
    { person, type: 'person' },
    { series: show(50), type: 'show' },
    { person, type: 'person' },
    { series: show(end), type: 'show' },
  ],
  steps: 2,
});

const LIBRARY: LibraryIds = {
  favorites: [],
  inProgress: [],
  watched: [OWN_START],
  watchlist: [],
};

/** `/home/connected` by start: the paths from it */
let paths: Record<number, ReadonlyArray<ConnectedPath>> = {};

beforeEach(() => {
  vi.clearAllMocks();
  paths = {
    [OWN_START]: [path(OWN_START, 200)],
    [SHARED_START]: [path(SHARED_START, 100)],
  };
  apiFetch.mockImplementation(
    async (_path: string, options: { query: { from: number } }) => ({
      date: DAY,
      paths: paths[options.query.from] ?? [],
    }),
  );
});

const fromOf = (call: ReadonlyArray<unknown>) =>
  (call[1] as { query: { from: number } }).query.from;

describe('getViewerPaths', () => {
  it('asks for the shared start’s paths while the library is on its way', async () => {
    let resolveLibrary: (ids: LibraryIds) => void = () => {};
    fetchLibraryIds.mockReturnValue(
      new Promise<LibraryIds>((resolve) => {
        resolveLibrary = resolve;
      }),
    );
    const result = getViewerPaths('token', DAY, [path(SHARED_START, 100)]);
    await vi.waitFor(() =>
      expect(apiFetch.mock.calls.map(fromOf)).toEqual([SHARED_START]),
    );
    resolveLibrary(LIBRARY);
    await expect(result).resolves.toEqual([path(OWN_START, 200)]);
  });

  it('falls back to the shared start’s paths when the viewer’s own has none left', async () => {
    fetchLibraryIds.mockResolvedValue({
      ...LIBRARY,
      watchlist: [200],
    });
    await expect(
      getViewerPaths('token', DAY, [path(SHARED_START, 100)]),
    ).resolves.toEqual([path(SHARED_START, 100)]);
    expect(apiFetch.mock.calls.map(fromOf).sort()).toEqual([
      SHARED_START,
      OWN_START,
    ]);
  });

  it('is null when no start has a path left for the viewer', async () => {
    fetchLibraryIds.mockResolvedValue({
      ...LIBRARY,
      watchlist: [100, 200],
    });
    await expect(
      getViewerPaths('token', DAY, [path(SHARED_START, 100)]),
    ).resolves.toBeNull();
  });
});
