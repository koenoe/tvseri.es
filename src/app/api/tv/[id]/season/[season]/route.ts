import { fetchTvSeriesSeason } from '@/lib/tmdb';

export async function GET(
  _req: Request,
  { params }: { params: { id: string; season: string } },
) {
  const season = await fetchTvSeriesSeason(params.id, params.season);
  return Response.json(season);
}
