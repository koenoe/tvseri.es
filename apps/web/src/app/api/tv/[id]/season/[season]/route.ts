import { cachedTvSeriesSeason } from '@/lib/cached';

export async function GET(
  _req: Request,
  {
    params: paramsFromProps,
  }: { params: Promise<{ id: string; season: string }> },
) {
  const params = await paramsFromProps;
  const season = await cachedTvSeriesSeason(params.id, params.season);

  return Response.json(season, {
    headers: {
      'Cache-Control': 'public, max-age=43200, immutable',
    },
  });
}
