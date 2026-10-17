import type { Keyword } from '@tvseri.es/schemas';
import type { NextRequest } from 'next/server';

import { fetchKeyword, searchKeywords } from '@/lib/api';
import isNumericId from '@/utils/isNumericId';
import { CACHE_HEADERS } from '../cacheHeaders';

// Same cap as discover's list filters (`MAX_DISCOVER_LIST_VALUES`), which is
// where these ids come from. Bounds the fan-out of one public request.
const MAX_IDS = 20;

async function fetchKeywords(ids: ReadonlyArray<string>) {
  const keywords = await Promise.all(ids.map((id) => fetchKeyword(id)));
  return keywords.filter((keyword): keyword is Keyword => keyword !== null);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const idParam = searchParams.get('id');
  const ids = idParam
    ? [...new Set(idParam.split(','))].filter(isNumericId)
    : undefined;

  if (!query && !ids) {
    return Response.json({ error: 'No query or ids' }, { status: 400 });
  }

  if (ids && ids.length > MAX_IDS) {
    return Response.json({ error: 'Too many ids' }, { status: 400 });
  }

  const response = query
    ? await searchKeywords(query)
    : await fetchKeywords(ids ?? []);

  return Response.json(response, {
    headers: { 'Cache-Control': CACHE_HEADERS.medium },
  });
}
