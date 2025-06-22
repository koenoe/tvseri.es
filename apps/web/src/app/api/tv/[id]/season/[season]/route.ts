import { fetchTvSeriesSeason } from '@/lib/api';

export async function GET(
  _req: Request,
  {
    params: paramsFromProps,
  }: { params: Promise<{ id: string; season: string }> },
) {
  const params = await paramsFromProps;
  const season = await fetchTvSeriesSeason(params.id, params.season);

  return Response.json(season);
}
