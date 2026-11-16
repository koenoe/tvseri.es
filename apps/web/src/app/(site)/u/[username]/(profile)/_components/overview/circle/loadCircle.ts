import 'server-only';

import type { CirclePick, TvSeries } from '@tvseri.es/schemas';

import { loadSeriesOrNull } from '@/lib/series/loaders';

/** A pick with the show's own facts (backdrop, title treatment, years) */
export type LoadedPick = Readonly<{ pick: CirclePick; series: TvSeries }>;

/** The picks whose show could be read, in order */
export async function loadPicks(
  picks: ReadonlyArray<CirclePick>,
): Promise<ReadonlyArray<LoadedPick>> {
  const series = await Promise.all(
    picks.map(({ show }) => loadSeriesOrNull(show.id)),
  );
  return picks.flatMap((pick, index) => {
    const found = series[index];
    return found ? [{ pick, series: found }] : [];
  });
}
