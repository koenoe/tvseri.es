import { cachedTvSeriesSeason } from '@/app/cached';
import toCanonicalId from '@/utils/toCanonicalId';
import { CACHE_HEADERS } from '../../../../cacheHeaders';

// Same profile as the API's season endpoint (episodes air daily). 404s are
// cached with it too, on purpose: repeated misses are served from the CDN.
const headers = { 'Cache-Control': CACHE_HEADERS.short };

export async function GET(
  request: Request,
  {
    params: paramsFromProps,
  }: { params: Promise<{ id: string; season: string }> },
) {
  const params = await paramsFromProps;
  const id = toCanonicalId(params.id);
  const season = toCanonicalId(params.season);

  if (!id || !season) {
    return new Response(null, { headers, status: 404 });
  }

  // Leading zeros (`/0123/season/01`): one canonical URL per season, so the
  // CDN and `use cache` don't hold duplicates. Cached like the response.
  if (id !== params.id || season !== params.season) {
    const location = new URL(`/api/tv/${id}/season/${season}`, request.url);
    return new Response(null, {
      headers: { ...headers, Location: location.toString() },
      status: 308,
    });
  }

  const result = await cachedTvSeriesSeason(id, season);

  if (!result) {
    return new Response(null, { headers, status: 404 });
  }

  return Response.json(result, { headers });
}
