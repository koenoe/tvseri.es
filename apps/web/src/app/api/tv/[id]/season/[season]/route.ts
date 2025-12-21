import { fetchTvSeriesSeason } from '@/lib/api';
import isNumericId from '@/utils/isNumericId';

export async function GET(
  _req: Request,
  {
    params: paramsFromProps,
  }: { params: Promise<{ id: string; season: string }> },
) {
  const params = await paramsFromProps;

  if (!isNumericId(params.id) || !isNumericId(params.season)) {
    return new Response(null, { status: 404 });
  }

  const season = await fetchTvSeriesSeason(params.id, params.season);

  return Response.json(season);
}
