import { type NextRequest } from 'next/server';

import { fetchKeyword, searchKeywords } from '@/lib/tmdb';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const ids = searchParams.get('id')?.split(',');

  if (!query && !ids) {
    return Response.json({ error: 'No query or ids' }, { status: 400 });
  }

  let response;
  if (query) {
    response = await searchKeywords(query);
  } else {
    const promises = ids!.map((id) => fetchKeyword(parseInt(id, 10)));
    response = await Promise.all(promises);
  }

  return Response.json(response);
}
