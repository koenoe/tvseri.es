import type { TvSeries } from '@tvseri.es/schemas';

import { fetchDiscoverTvSeries } from '@/lib/tmdb/discover';

/** A series that first aired in the window: its first season */
export type NewSeriesDraft = Readonly<{
  date: string;
  kind: 'new-series';
  seasonNumber: 1;
  series: TvSeries;
}>;

export type DiscoveredWindow = Readonly<{
  /** Shows with an episode in the window, each once, not in `newSeries` */
  airing: ReadonlyArray<TvSeries>;
  /** The discover reads that failed */
  failed: number;
  /** Series whose first air date is in the window */
  newSeries: ReadonlyArray<NewSeriesDraft>;
}>;

const inWindow = (date: string, start: string, end: string) =>
  date >= start && date <= end;

/**
 * Discover's two reads for a window of dates (`start` to `end`, both UTC
 * days, inclusive), most popular first: series that first aired in it, and
 * `airingPages` pages of shows with an episode in it. Throws when neither
 * the first list nor the first airing page answered; any other failed read
 * is counted in `failed` and leaves its list empty.
 */
export const discoverWindow = async ({
  airingPages,
  end,
  start,
}: Readonly<{
  airingPages: number;
  end: string;
  start: string;
}>): Promise<DiscoveredWindow> => {
  const discovered = await Promise.allSettled([
    fetchDiscoverTvSeries({
      'first_air_date.gte': start,
      'first_air_date.lte': end,
      sort_by: 'popularity.desc',
    }),
    ...Array.from({ length: airingPages }, (_, index) =>
      fetchDiscoverTvSeries({
        'air_date.gte': start,
        'air_date.lte': end,
        ...(index > 0 && { page: index + 1 }),
        sort_by: 'popularity.desc',
      }),
    ),
  ]);
  if (
    discovered[0].status === 'rejected' &&
    discovered[1]?.status === 'rejected'
  ) {
    throw discovered[0].reason;
  }
  const [fresh = [], ...airingLists] = discovered.map((result) =>
    result.status === 'fulfilled' ? result.value.items : [],
  );

  const newSeries = fresh
    .filter((series) => inWindow(series.firstAirDate.slice(0, 10), start, end))
    .map(
      (series): NewSeriesDraft => ({
        date: series.firstAirDate.slice(0, 10),
        kind: 'new-series',
        seasonNumber: 1,
        series,
      }),
    );
  const newIds = new Set(newSeries.map((draft) => draft.series.id));
  const airing = [
    ...new Map(
      airingLists.flat().map((series) => [series.id, series] as const),
    ).values(),
  ].filter((series) => !newIds.has(series.id));

  return {
    airing,
    failed: discovered.filter((result) => result.status === 'rejected').length,
    newSeries,
  };
};
