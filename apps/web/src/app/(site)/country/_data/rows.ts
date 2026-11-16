import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { isUnavailable, type Unavailable } from '@/lib/cache/unavailable';

import {
  type DiscoverShows,
  discoverQueryString,
  getDiscoverShows,
} from '../../_discover/data/discover';
import {
  bestRated,
  discoverRowSource,
  discoverTabsSource,
  whereToStartSource,
} from '../../_discover/data/rowSources';
import { type RowLoader, toRowShow } from '../../_discover/landing';
import type { SecondRow } from './madeFor';

/** "Best from": rated by TMDB voters, 50 votes or more */
const BEST_VOTES = 50;
/** "New from": first aired in the last 3 years */
const NEW_YEARS = 3;

/**
 * "New from {country}": its shows first aired in the last 3 years, most
 * popular first. The window starts on the first of the month, so the query
 * (and its cache key) changes once a month, not every day. Cached `medium`.
 */
async function getNewFrom(code: string): Promise<DiscoverShows | Unavailable> {
  'use cache';
  cacheTag(`country-new:${code}`);

  const today = new Date();
  const from = new Date(
    Date.UTC(today.getUTCFullYear() - NEW_YEARS, today.getUTCMonth(), 1),
  );
  const found = await getDiscoverShows(
    discoverQueryString({
      'first_air_date.gte': from.toISOString().slice(0, 10),
      with_origin_country: code,
    }),
  );
  if (isUnavailable(found)) {
    cacheLife('unavailable');
    return found;
  }
  cacheLife('medium');
  return found;
}

/**
 * One loader per row of `/country/{code}`, top to bottom, so no
 * row repeats a show above it (`planRow`): Where to start's three picks,
 * Made for (one list per broadcaster) or Best from, then New from.
 */
export function countryRowLoaders(
  code: string,
  second: SecondRow,
): ReadonlyArray<RowLoader> {
  const country = { with_origin_country: code };
  return [
    () => whereToStartSource('country', code),
    () =>
      second.kind === 'best'
        ? discoverRowSource(
            discoverQueryString({ ...country, ...bestRated(BEST_VOTES) }),
          )
        : discoverTabsSource(
            'country-made-for',
            second.tabs.map((tab) => ({
              key: tab.key,
              query: discoverQueryString({
                ...country,
                with_networks: String(tab.networkId),
              }),
            })),
          ),
    async () => {
      const found = await getNewFrom(code);
      return isUnavailable(found)
        ? found
        : { kind: 'shows', shows: found.items.map(toRowShow) };
    },
  ];
}
