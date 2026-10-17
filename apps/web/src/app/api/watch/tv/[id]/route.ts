import type { NextRequest } from 'next/server';
import { cachedTvSeries } from '@/app/cached';
import { markEpisodesWatched } from '@/app/watchedService';
import auth from '@/auth';
import { unmarkWatched } from '@/lib/api';
import isNumericId from '@/utils/isNumericId';

type BodyPayload = Readonly<{
  watched: boolean;
  seasonNumber?: number;
  episodeNumber?: number;
}>;

export async function POST(
  req: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> },
) {
  const [params, json] = await Promise.all([_params, req.json()]);
  const body = json as BodyPayload;

  if (!body || !params.id || !isNumericId(params.id)) {
    return Response.json({ error: 'No payload found' }, { status: 400 });
  }

  const [tvSeries, { user, accessToken }] = await Promise.all([
    cachedTvSeries(params.id),
    auth(req),
  ]);
  if (!user || !accessToken) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!tvSeries?.firstAirDate || !tvSeries.hasAired) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  if (body.watched) {
    const watchedItems = await markEpisodesWatched({
      accessToken,
      episodeNumber: body.episodeNumber,
      headers: req.headers,
      seasonNumber: body.seasonNumber,
      seriesId: tvSeries.id,
      user,
    });
    return Response.json(watchedItems);
  } else {
    await unmarkWatched({
      accessToken,
      episodeNumber: body.episodeNumber,
      seasonNumber: body.seasonNumber,
      seriesId: tvSeries.id,
      userId: user.id,
    });
    return Response.json({
      episodeNumber: body.episodeNumber,
      removedAt: Date.now(),
      seasonNumber: body.seasonNumber,
      tvSeriesId: tvSeries.id,
    });
  }
}
