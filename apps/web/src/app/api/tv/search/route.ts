import { type NextRequest } from 'next/server';

import { searchTvSeries } from '@/lib/tmdb';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return Response.json({ error: 'No query' }, { status: 400 });
  }

  const response = await searchTvSeries(query);

  return Response.json(response, {
    headers: {
      'Cache-Control': 'public, max-age=3600, immutable',
    },
  });
}
