import { seasonCode } from '@tvseri.es/schemas';
import { isRunning } from '@tvseri.es/utils';

/** A show's status as a fact beside its title: the glyph kind and the words */
export type StatusFact = Readonly<{
  kind: 'ended' | 'ongoing';
  text: string;
}>;

/**
 * TMDB's status as every page says it. A returning show with `seasons` out
 * is "S0{seasons + 1} renewed": TMDB's "Returning Series" carries the next
 * season, but it can't tell a renewal from a season still airing, so this is
 * the best the data says. A status it has no words for is shown as TMDB has
 * it.
 */
export function statusLabel(status: string, seasons = 0): string {
  switch (status) {
    case 'Returning Series':
      return seasons > 0 ? `${seasonCode(seasons + 1)} renewed` : 'Returning';
    case 'Ended':
      return 'Ended';
    case 'Canceled':
      return 'Cancelled';
    case 'Planned':
    case 'In Production':
    case 'Pilot':
      return 'In production';
    default:
      return status;
  }
}

/**
 * The status with its glyph kind (Library tiles, Favourites slices); none is
 * null. A status TMDB doesn't list as running reads as ended, as the series'
 * years do (`formatSeriesYears`).
 */
export function statusFact(status: string, seasons = 0): StatusFact | null {
  if (!status) {
    return null;
  }
  return {
    kind: isRunning(status) ? 'ongoing' : 'ended',
    text: statusLabel(status, seasons),
  };
}
