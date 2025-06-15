import { type NextRequest } from 'next/server';

import { fetchDiscoverTvSeries } from '@/lib/api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pageFromSearchParams = searchParams.get('pageOrCursor');
  const page = pageFromSearchParams ? parseInt(pageFromSearchParams, 10) : 1;
  const query = {
    ...Object.fromEntries(searchParams.entries()),
    page,
  };
  const response = await fetchDiscoverTvSeries(query);

  const totalNumberOfPages = response?.totalNumberOfPages ?? 0;
  const items = response?.items ?? [];
  const nextPage = page + 1;
  const nextPageOrCursor =
    nextPage >= totalNumberOfPages || items.length === 0 ? null : nextPage;

  return Response.json({
    items,
    nextPageOrCursor,
  });
}
