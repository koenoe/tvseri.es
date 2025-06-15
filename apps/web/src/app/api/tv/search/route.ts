import { type NextRequest } from 'next/server';

import { searchTvSeries } from '@/lib/api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return Response.json({ error: 'No query' }, { status: 400 });
  }

  const response = await searchTvSeries(query);

  return Response.json(response);
}
