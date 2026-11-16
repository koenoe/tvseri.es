import { hasEnoughPosters } from '@tvseri.es/constants';
import type { TvSeries } from '@tvseri.es/schemas';

/**
 * How many the numbered row draws. The API reads 24 of the list
 * (`LIST_SIZES.topRated`), so a few shows without a poster still leave
 * twenty.
 */
export const ALL_TIME_COUNT = 20;

/** A ranked poster: only what the numbered tile draws */
export type RankedShow = Readonly<{
  id: number;
  poster: string;
  rank: number;
  slug: string;
  title: string;
}>;

/**
 * The owner's MDBList list, in its own order, as the numbered row draws it:
 * shows without a poster are skipped (the next moves up, so ranks stay
 * 1..N), the first `ALL_TIME_COUNT`, none under `MIN_POSTERS`. A ranked list
 * can't skip ranks, so no row above takes shows out of it (never-repeat).
 */
export function rankedShows(
  list: ReadonlyArray<TvSeries>,
): ReadonlyArray<RankedShow> {
  const seen = new Set<number>();
  const shows = list
    .filter(
      (series) =>
        Boolean(series.posterImage) &&
        !seen.has(series.id) &&
        Boolean(seen.add(series.id)),
    )
    .slice(0, ALL_TIME_COUNT)
    .map((series, index) => ({
      id: series.id,
      poster: series.posterImage as string,
      rank: index + 1,
      slug: series.slug,
      title: series.title,
    }));
  return hasEnoughPosters(shows.length) ? shows : [];
}
