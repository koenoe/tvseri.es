import type { PopularItem } from '../../_data/loaders';

/** How many posters the board draws in a row */
export const POPULAR_SLOTS = 5;

/**
 * Popular shows of the year the profile owner didn't watch, at most one
 * row.
 */
export function unwatchedPopular(
  popular: ReadonlyArray<PopularItem>,
  watchedIds: ReadonlyArray<number>,
): ReadonlyArray<PopularItem> {
  const watched = new Set(watchedIds);
  return popular
    .filter((series) => !watched.has(series.id))
    .slice(0, POPULAR_SLOTS);
}

/** "Crime · 9 episodes": TMDB's paired genres by their first half ("Sci-Fi") */
export function popularMeta(series: PopularItem): string {
  const genre = series.genre?.split(' & ')[0] ?? null;
  const episodes =
    series.episodes && series.episodes > 0
      ? `${series.episodes} ${series.episodes === 1 ? 'episode' : 'episodes'}`
      : null;
  return [genre, episodes].filter(Boolean).join(' · ');
}

/** "More" goes to the year's decade landing (`/decade/2020s`) */
export const decadePath = (year: number) =>
  `/decade/${Math.floor(year / 10) * 10}s`;
