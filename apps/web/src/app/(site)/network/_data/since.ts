import 'server-only';

import { isUnavailable, type Unavailable } from '@/lib/cache/unavailable';

import {
  discoverQueryString,
  getDiscoverShows,
} from '../../_discover/data/discover';

/**
 * Its first shows on TMDB are often a stray old special: only shows with
 * this many votes count.
 */
const MIN_VOTES = '10';

/**
 * "Since 1972" (the hero's meta line): the first air year of the network's
 * earliest show on TMDB (`GET /discover` oldest first, cached `medium`).
 * Null when it has none.
 */
export async function getNetworkSince(
  networkId: number,
): Promise<number | null | Unavailable> {
  const shows = await getDiscoverShows(
    discoverQueryString({
      'first_air_date.gte': '1900-01-01',
      sort_by: 'first_air_date.asc',
      'vote_count.gte': MIN_VOTES,
      with_networks: String(networkId),
    }),
  );
  if (isUnavailable(shows)) {
    return shows;
  }
  return shows.items.find((show) => show.year !== null)?.year ?? null;
}
