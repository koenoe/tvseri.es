import 'server-only';

import { loadTrending } from '../../../_data/trending';
import { cardOfSeries } from './cardOfSeries';
import type { StartCard } from './startCards';

/** Enough for a full deck after Up next's three borrowed shows */
const MAX = 12;

/**
 * Popular this week, as deck cards (an empty watchlist and nobody followed,
 * from the shared cached read; empty during an outage, so the block
 * simply isn't drawn until the API answers.
 */
export async function loadTrendingCards(): Promise<ReadonlyArray<StartCard>> {
  const shows = (await loadTrending()) ?? [];
  return shows
    .filter((show) => show.posterImage)
    .slice(0, MAX)
    .map((show) => cardOfSeries(show));
}
