import { headers } from 'next/headers';

import { cachedTvSeries } from '@/app/cached';
import auth from '@/auth';
import {
  fetchTvSeriesWatchProvider,
  markWatched,
  unmarkWatched,
} from '@/lib/api';

type BodyPayload = Readonly<{
  watched: boolean;
  seasonNumber?: number;
  episodeNumber?: number;
}>;

export async function POST(
  req: Request,
  { params: _params }: { params: Promise<{ id: string }> },
) {
  const [params, json] = await Promise.all([_params, req.json()]);
  const body = json as BodyPayload;

  if (!body || !params.id) {
    return Response.json({ error: 'No payload found' }, { status: 400 });
  }

  const tvSeries = await cachedTvSeries(params.id);
  if (!tvSeries || !tvSeries.firstAirDate || !tvSeries.hasAired) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const { user, encryptedSessionId } = await auth();
  if (!user || !encryptedSessionId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const region = (await headers()).get('cloudfront-viewer-country') || 'US';
  const watchProvider =
    (await fetchTvSeriesWatchProvider(tvSeries.id, region)) ?? null;

  if (body.watched) {
    const watchedItems = await markWatched({
      episodeNumber: body.episodeNumber,
      seasonNumber: body.seasonNumber,
      seriesId: tvSeries.id,
      userId: user.id,
      watchProvider,
      sessionId: encryptedSessionId,
    });
    return Response.json(watchedItems);
  } else {
    await unmarkWatched({
      episodeNumber: body.episodeNumber,
      seasonNumber: body.seasonNumber,
      seriesId: tvSeries.id,
      userId: user.id,
      sessionId: encryptedSessionId,
    });
    return Response.json({
      episodeNumber: body.episodeNumber,
      seasonNumber: body.seasonNumber,
      tvSeriesId: tvSeries.id,
      removedAt: Date.now(),
    });
  }
}
