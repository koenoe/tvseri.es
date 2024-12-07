import { cookies } from 'next/headers';

import { findSession } from '@/lib/db/session';
import { findUser } from '@/lib/db/user';
import {
  markSeasonWatched,
  markTvSeriesWatched,
  markWatched,
  unmarkSeasonWatched,
  unmarkTvSeriesWatched,
  unmarkWatched,
} from '@/lib/db/watched';
import { fetchTvSeries, fetchTvSeriesEpisode } from '@/lib/tmdb';
import { decryptToken } from '@/lib/token';

type BodyPayload = Readonly<{
  watched: boolean;
  seasonNumber?: number;
  episodeNumber?: number;
}>;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json()) as BodyPayload;

  if (!body) {
    return Response.json({ error: 'No payload found' }, { status: 400 });
  }

  const tvSeries = await fetchTvSeries(id);

  if (
    !tvSeries ||
    !tvSeries.firstAirDate ||
    new Date(tvSeries.firstAirDate) > new Date()
  ) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const cookieStore = await cookies();
  const encryptedSessionId = cookieStore.get('sessionId')?.value;

  if (!encryptedSessionId) {
    return Response.json({ error: 'Invalid session' }, { status: 401 });
  }

  const decryptedSessionId = decryptToken(encryptedSessionId);
  const session = await findSession(decryptedSessionId);

  if (!session) {
    return Response.json({ error: 'No valid session found' }, { status: 401 });
  }

  const user = await findUser({ userId: session.userId });

  if (!user) {
    return Response.json(
      { error: 'No valid user found in session' },
      { status: 401 },
    );
  }

  if (body.seasonNumber && body.episodeNumber) {
    const episode = await fetchTvSeriesEpisode(
      id,
      body.seasonNumber,
      body.episodeNumber,
    );

    const payload = {
      episodeNumber: episode.episodeNumber,
      runtime: episode.runtime,
      seasonNumber: episode.seasonNumber,
      tvSeries,
      userId: user.id,
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

  return Response.json('hoi');
}
