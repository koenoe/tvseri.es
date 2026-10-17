import { cachedTvSeriesSeason } from '@/app/cached';
import isNumericId from '@/utils/isNumericId';
import { CACHE_HEADERS } from '../../../../cacheHeaders';

// Same profile as the API's season endpoint (episodes air daily). 404s are
// cached with it too, on purpose: repeated misses are served from the CDN.
const headers = { 'Cache-Control': CACHE_HEADERS.short };

export async function GET(
  _req: Request,
  {
    params: paramsFromProps,
  }: { params: Promise<{ id: string; season: string }> },
) {
  const params = await paramsFromProps;

  if (!isNumericId(params.id) || !isNumericId(params.season)) {
    return new Response(null, { headers, status: 404 });
  }

  const season = await cachedTvSeriesSeason(params.id, params.season);

  if (!season) {
    return new Response(null, { headers, status: 404 });
  }

  return Response.json(season, { headers });
}
