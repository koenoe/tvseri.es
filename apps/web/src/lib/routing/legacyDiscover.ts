import { DISCOVER_FILTER_KEYS } from '@tvseri.es/constants';

type Rewrite = Readonly<{
  destination: string;
  has: Array<{ key: string; type: 'query' }>;
  source: string;
}>;

/**
 * Old `/discover?with_genres=80`-style links (the filter grid is gone) go to
 * a route handler that answers a permanent redirect to the matching landing
 * (`landingPathFromDiscoverQuery`), or to the bare hub. One rewrite per
 * filter key: Next's `has` matches literal keys only. A rewrite runs no
 * function by itself, so `/discover` without filters stays the cached page.
 */
export const LEGACY_DISCOVER_REWRITES: ReadonlyArray<Rewrite> =
  DISCOVER_FILTER_KEYS.map((key) => ({
    destination: '/api/discover/legacy',
    has: [{ key, type: 'query' }],
    source: '/discover',
  }));
