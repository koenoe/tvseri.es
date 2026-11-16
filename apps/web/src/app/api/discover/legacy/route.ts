import { landingPathFromDiscoverQuery } from '@tvseri.es/constants';

import { CACHE_HEADERS } from '@/app/api/cacheHeaders';

/**
 * Old `/discover?with_*` links land here through a rewrite
 * (`lib/routing/legacyDiscover.ts`) and get a permanent redirect to the one
 * landing their filters describe, else to the hub. The Location is relative,
 * so the Host header is never trusted.
 */
export function GET(request: Request): Response {
  const query = Object.fromEntries(new URL(request.url).searchParams);
  return new Response(null, {
    headers: {
      'Cache-Control': CACHE_HEADERS.medium,
      Location: landingPathFromDiscoverQuery(query),
    },
    status: 308,
  });
}
