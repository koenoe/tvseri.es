import { headers } from 'next/headers';

import { cachedTvSeries } from '@/app/cached';
import auth from '@/auth';
import {
  markSeasonWatched,
  markTvSeriesWatched,
  markWatched,
  unmarkSeasonWatched,
  unmarkTvSeriesWatched,
  unmarkWatched,
} from '@/lib/db/watched';
import { fetchTvSeriesEpisode, fetchTvSeriesWatchProvider } from '@/lib/tmdb';

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
  if (!tvSeries || !tvSeries.firstAirDate || tvSeries.hasAired) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const { user } = await auth();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const region = (await headers()).get('cloudfront-viewer-country') || 'US';
  const watchProvider = await fetchTvSeriesWatchProvider(tvSeries.id, region);

  if (body.seasonNumber && body.episodeNumber) {
    const episode = await fetchTvSeriesEpisode(
      tvSeries.id,
      body.seasonNumber,
      body.episodeNumber,
    );

    const payload = {
      episodeNumber: episode.episodeNumber,
      runtime: episode.runtime,
      seasonNumber: episode.seasonNumber,
      tvSeries,
      userId: user.id,
      watchProvider,
    };
    if (body.watched) {
      const watchedItem = await markWatched(payload);
      return Response.json([watchedItem]);
    } else {
      await unmarkWatched(payload);
      return Response.json({
        episodeNumber: payload.episodeNumber,
        seasonNumber: payload.seasonNumber,
        tvSeriesId: tvSeries.id,
        removedAt: Date.now(),
      });
    }
  }

  if (body.seasonNumber) {
    const payload = {
      seasonNumber: body.seasonNumber,
      tvSeries,
      userId: user.id,
      watchProvider,
    };
    if (body.watched) {
      const watchedItems = await markSeasonWatched(payload);
      return Response.json(watchedItems);
    } else {
      await unmarkSeasonWatched(payload);
      return Response.json({
        seasonNumber: payload.seasonNumber,
        tvSeriesId: tvSeries.id,
        removedAt: Date.now(),
      });
    }
  }

  const payload = {
    tvSeries,
    userId: user.id,
    watchProvider,
  };
  if (body.watched) {
    const watchedItems = await markTvSeriesWatched(payload);
    return Response.json(watchedItems);
  } else {
    await unmarkTvSeriesWatched(payload);
    return Response.json({
      tvSeriesId: tvSeries.id,
      removedAt: Date.now(),
    });
  }
}
