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

  const { user, accessToken } = await auth(req);
  if (!user || !accessToken) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const headerStore = await headers();
  const region =
    user.country || headerStore.get('cloudfront-viewer-country') || 'US';
  const watchProvider =
    (await fetchTvSeriesWatchProvider(tvSeries.id, region, accessToken)) ??
    null;

  if (body.watched) {
    const watchedItems = await markWatched({
      accessToken,
      episodeNumber: body.episodeNumber,
      region,
      seasonNumber: body.seasonNumber,
      seriesId: tvSeries.id,
      userId: user.id,
      watchProvider,
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
