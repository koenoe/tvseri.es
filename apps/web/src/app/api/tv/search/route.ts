import type { NextRequest } from 'next/server';

import { searchTvSeries } from '@/lib/api';
import normalizeSearchQuery from '@/utils/normalizeSearchQuery';
import { toPosterItem } from '@/utils/toPosterItem';
import { CACHE_HEADERS } from '../../cacheHeaders';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = normalizeSearchQuery(searchParams.get('q') ?? '');

  if (!query) {
    return Response.json({ error: 'No query' }, { status: 400 });
  }

  const response = await searchTvSeries(query);
  // Note: SearchResults only renders posters, so only send what it reads
  const items = response.map(toPosterItem);

  return Response.json(items, {
    headers: { 'Cache-Control': CACHE_HEADERS.medium },
  });
}
