import { normalizeSearchQuery } from '@tvseri.es/utils';
import type { NextRequest } from 'next/server';

import { apiFetch } from '@/lib/api/client';
import { MAX_QUERY_LENGTH } from '@/lib/search/searchKey';
import { SearchViewSchema } from '@/lib/search/searchView';

import { publicJson } from '../cacheHeaders';

/**
 * The search overlay's one request: shows and people for `q` (API
 * `GET /search`). `q` is normalised first, so every spelling shares one CDN
 * key (the client normalises too). High cardinality, so no `use cache`: the
 * CDN holds it for the `medium` profile, with no browser max-age.
 *
 * A failed API call is a 502 with `no-store`, so the CDN never pins it and
 * the overlay shows its error row.
 */
export async function GET(request: NextRequest) {
  const q = normalizeSearchQuery(request.nextUrl.searchParams.get('q') ?? '');

  if (!q || q.length > MAX_QUERY_LENGTH) {
    return publicJson({ error: 'InvalidQuery' }, { status: 400 });
  }

  try {
    const results = await apiFetch('/search', {
      query: { q },
      schema: SearchViewSchema,
    });
    return publicJson(results, { life: 'medium' });
  } catch {
    // apiFetch already logged the path and status
    return publicJson(
      { error: 'SearchFailed' },
      { life: 'no-store', status: 502 },
    );
  }
}
