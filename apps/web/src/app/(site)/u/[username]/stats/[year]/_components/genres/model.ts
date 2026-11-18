import type { StatsGenreItem } from '@tvseri.es/schemas';
import { plural } from '@tvseri.es/utils';

/** The phone shows the top six genres; desktop all (up to ten) */
export const PHONE_ROWS = 6;

export type GenreRow = Readonly<{
  name: string;
  /** "48 shows", "1 show" */
  value: string;
  /** The bar's width against the top genre: "52.1%" */
  width: string;
  /** The top genre's bar is white, the others white/40 */
  top: boolean;
}>;

/** One row per genre, the highest count first as the API sorts them */
export function genreRows(
  items: ReadonlyArray<StatsGenreItem>,
): ReadonlyArray<GenreRow> {
  const max = Math.max(0, ...items.map((item) => item.count));
  if (max === 0) {
    return [];
  }
  return items.map((item, index) => ({
    name: item.genre,
    top: index === 0,
    value: plural(item.count, 'series', 'series'),
    width: `${((item.count / max) * 100).toFixed(1)}%`,
  }));
}
