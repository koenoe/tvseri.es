import { type NextRequest } from 'next/server';

import { fetchDiscoverTvSeries } from '@/lib/tmdb';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pageFromSearchParams = searchParams.get('page');
  const page = pageFromSearchParams ? parseInt(pageFromSearchParams, 10) : 1;

  let response = await fetchDiscoverTvSeries({ page });

  return Response.json(response?.items ?? [], {
    headers: {
      'Cache-Control': 'public, max-age=3600, immutable',
    },
  });
}
