import {
  MAX_DISCOVER_PAGE,
  normalizeDiscoverQuery,
  type Page,
  parseDiscoverPage,
  type TvSeries,
} from '@tvseri.es/schemas';
import type { NextRequest } from 'next/server';

import { fetchDiscoverTvSeries } from '@/lib/api';
import { CACHE_HEADERS } from '../../cacheHeaders';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = parseDiscoverPage(searchParams.get('cursor'));

  if (page === null) {
    return Response.json({ error: 'Invalid cursor' }, { status: 400 });
  }

  // Note: the client sends the canonical query (incl. watch_region when needed), so this route
  // never reads headers or cookies and its response can be shared through the CDN.
  const { query } = normalizeDiscoverQuery(searchParams);
  const { items, totalNumberOfPages } = await fetchDiscoverTvSeries({
    ...query,
    page,
  });

  const lastPage = Math.min(totalNumberOfPages, MAX_DISCOVER_PAGE);
  const nextCursor =
    items.length === 0 || page >= lastPage ? null : String(page + 1);

  return Response.json({ items, nextCursor } satisfies Page<TvSeries>, {
    headers: { 'Cache-Control': CACHE_HEADERS.medium },
  });
}
