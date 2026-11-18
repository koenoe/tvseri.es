import type { TvSeries } from '@tvseri.es/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fetchDiscoverTvSeries: vi.fn() }));

vi.mock('@/lib/tmdb', () => ({
  fetchDiscoverTvSeries: mocks.fetchDiscoverTvSeries,
}));

import { discoverWindow } from './discoverWindow';

const series = (id: number, firstAirDate = '2020-01-01') =>
  ({ firstAirDate, id }) as TvSeries;

type Query = Readonly<Record<string, unknown>>;

/** Answers each read by its kind (first air date or air date) and page */
const answer = (
  lists: Readonly<{
    fresh?: ReadonlyArray<TvSeries> | Error;
    airing?: ReadonlyArray<ReadonlyArray<TvSeries> | Error>;
  }>,
) =>
  mocks.fetchDiscoverTvSeries.mockImplementation(async (query: Query) => {
    const list =
      'first_air_date.gte' in query
        ? lists.fresh
        : lists.airing?.[((query.page as number | undefined) ?? 1) - 1];
    if (list instanceof Error) {
      throw list;
    }
    return { items: list ?? [] };
  });

const WINDOW = { end: '2026-11-21', start: '2026-11-14' };

beforeEach(() => {
  mocks.fetchDiscoverTvSeries.mockReset();
});

describe('discoverWindow', () => {
  it('reads new series and each airing page, most popular first', async () => {
    answer({});
    await discoverWindow({ ...WINDOW, airingPages: 2 });

    expect(mocks.fetchDiscoverTvSeries.mock.calls.map(([q]) => q)).toEqual([
      {
        'first_air_date.gte': WINDOW.start,
        'first_air_date.lte': WINDOW.end,
        sort_by: 'popularity.desc',
      },
      {
        'air_date.gte': WINDOW.start,
        'air_date.lte': WINDOW.end,
        sort_by: 'popularity.desc',
      },
      {
        'air_date.gte': WINDOW.start,
        'air_date.lte': WINDOW.end,
        page: 2,
        sort_by: 'popularity.desc',
      },
    ]);
  });

  it('keeps new series that first aired in the window, as first seasons', async () => {
    answer({
      fresh: [
        series(1, '2026-11-14'),
        series(2, '2026-11-13'),
        series(3, '2026-11-21T00:00:00Z'),
        series(4, ''),
      ],
    });
    const { newSeries } = await discoverWindow({ ...WINDOW, airingPages: 1 });

    expect(newSeries).toEqual([
      {
        date: '2026-11-14',
        kind: 'new-series',
        seasonNumber: 1,
        series: series(1, '2026-11-14'),
      },
      {
        date: '2026-11-21',
        kind: 'new-series',
        seasonNumber: 1,
        series: series(3, '2026-11-21T00:00:00Z'),
      },
    ]);
  });

  it('lists each airing show once, leaving out the new series', async () => {
    answer({
      airing: [
        [series(5), series(1), series(6)],
        [series(6), series(7)],
      ],
      fresh: [series(1, '2026-11-15')],
    });
    const { airing } = await discoverWindow({ ...WINDOW, airingPages: 2 });

    expect(airing.map(({ id }) => id)).toEqual([5, 6, 7]);
  });

  it('counts failed reads and throws only without the first two', async () => {
    answer({ airing: [[series(5)], new Error('page 2')], fresh: new Error() });
    const read = await discoverWindow({ ...WINDOW, airingPages: 2 });
    expect(read.failed).toBe(2);
    expect(read.airing.map(({ id }) => id)).toEqual([5]);

    const down = new Error('TMDB down');
    answer({ airing: [down, [series(7)]], fresh: down });
    await expect(discoverWindow({ ...WINDOW, airingPages: 2 })).rejects.toBe(
      down,
    );
  });
});
