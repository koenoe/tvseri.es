import type { SeasonRatings } from '@tvseri.es/schemas';
import { formatScore } from '@/lib/format/rating';

/**
 * What `GET /api/series/:id/season/:s/ratings` sends the modal: the IMDb
 * rating by episode number, null when IMDb has none.
 */
export type SeasonRatingsView = Readonly<Record<string, number | null>>;

export function toSeasonRatingsView(ratings: SeasonRatings): SeasonRatingsView {
  return Object.fromEntries(
    Object.entries(ratings.ratings).map(([episode, { imdbRating }]) => [
      episode,
      imdbRating,
    ]),
  );
}

/** "9.6" (one decimal, as IMDb shows it), or null when there's no rating. */
export function ratingLabel(
  ratings: SeasonRatingsView | null | undefined,
  episodeNumber: number,
): string | null {
  const rating = ratings?.[String(episodeNumber)];
  return formatScore(rating) || null;
}
