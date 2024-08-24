import { type NextRequest } from 'next/server';

import { fetchDiscoverTvSeries } from '@/lib/tmdb';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pageFromSearchParams = searchParams.get('page');
  const page = pageFromSearchParams ? parseInt(pageFromSearchParams, 10) : 1;
  const query = {
    ...Object.fromEntries(searchParams.entries()),
    page,
  };
  const response = await fetchDiscoverTvSeries(query);

  return Response.json(response?.items ?? [], {
    headers: {
      'Cache-Control': 'public, max-age=3600, immutable',
    },
  });
}
