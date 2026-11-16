import 'server-only';

import type { NetworkLandingFacts } from '@tvseri.es/schemas';

import { isUnavailable } from '@/lib/cache/unavailable';

import { discoverQueryString } from '../../_discover/data/discover';
import {
  bestRated,
  discoverRowSource,
  discoverTabsSource,
} from '../../_discover/data/rowSources';
import { toTileShow } from '../../_discover/data/tileShow';
import { type RowLoader, toRowShow } from '../../_discover/landing';
import type { BestOf } from './bestOf';
import { getNetworkSpotlight } from './spotlight';

/** "The best of": rated by TMDB voters, with enough votes to mean something */
const BEST = bestRated(50);
/** "Still running": TMDB's "Returning Series" */
const RUNNING = { with_status: '0' } as const;

/**
 * One loader per row of the page, top to bottom, so no row
 * repeats a show above it (`planRow`): the tile's show, the best of (one list
 * per switch tab), still running, the originals.
 */
export function networkRowLoaders(
  networkId: number,
  facts: NetworkLandingFacts,
  best: BestOf,
): ReadonlyArray<RowLoader> {
  const network = { with_networks: String(networkId) };
  return [
    async () => {
      const spot = await getNetworkSpotlight(networkId);
      if (isUnavailable(spot)) {
        return spot;
      }
      return {
        kind: 'shows',
        limit: 1,
        shows: spot
          ? [{ id: spot.id, poster: null, slug: spot.slug, title: spot.title }]
          : [],
        single: true,
      };
    },
    () =>
      best.kind === 'plain'
        ? discoverRowSource(discoverQueryString({ ...network, ...BEST }))
        : discoverTabsSource(
            'network-best',
            best.tabs.map((tab) => ({
              key: tab.key,
              query: discoverQueryString({
                ...network,
                ...tab.filter,
                ...BEST,
              }),
            })),
          ),
    () => discoverRowSource(discoverQueryString({ ...network, ...RUNNING })),
    async () => ({
      kind: 'shows',
      shows: facts.originals.items.map(toTileShow).map(toRowShow),
    }),
  ];
}
