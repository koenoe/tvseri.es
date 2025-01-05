import { cachedTvSeries } from '@/lib/cached';
import { markWatched } from '@/lib/db/watched';
import { findWebhookToken } from '@/lib/db/webhooks';
import { findByExternalId } from '@/lib/tmdb';
import { type WatchProvider } from '@/types/watch-provider';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return Response.json({ error: 'Missing token' }, { status: 400 });
  }

  const { provider } = await params;

  const webhookToken = await findWebhookToken(token);

  if (!webhookToken || webhookToken.type !== provider) {
    return Response.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Note: for now we only support Plex
  if (provider === 'plex') {
    try {
      const formData = await request.formData();
      const payloadJson = formData.get('payload');

      if (!payloadJson) {
        return Response.json({ error: 'No payload found' }, { status: 400 });
      }

      const payload = JSON.parse(payloadJson.toString()) as Readonly<{
        event: string;
        Metadata: Readonly<{
          librarySectionType: string;
          Guid?: ReadonlyArray<{ id: string }>;
          parentIndex: number; // Season number?
          index: number; // Episode number?
          year: number;
          title: string; // Episode title
          parentTitle: string; // Season title
          grandparentTitle: string; // Series title
          type: string;
        }>;
      }>;

      if (
        payload.event !== 'media.scrobble' ||
        payload.Metadata.type !== 'episode' ||
        payload.Metadata.librarySectionType !== 'show'
      ) {
        return Response.json({ message: 'OK' }, { status: 200 });
      }

      const tvdbId = payload.Metadata.Guid?.find((guid) =>
        guid.id.startsWith('tvdb://'),
      )?.id.replace('tvdb://', '');

      if (!tvdbId) {
        // TODO: match by title, year etc.
        return Response.json({ message: 'OK' }, { status: 200 });
      }

      const externalIdResults = await findByExternalId({
        externalId: tvdbId,
        externalSource: 'tvdb_id',
      });
      const episode = externalIdResults.episodes[0];

      if (!episode) {
        // TODO: match by title, year etc.
        return Response.json({ message: 'OK' }, { status: 200 });
      }

      const tvSeries = await cachedTvSeries(episode.tvSeriesId);

      // TODO: make it prettier
      const watchProvider = {
        id: 0,
        name: 'Plex',
        logo: '',
        logoPath: '/vLZKlXUNDcZR7ilvfY9Wr9k80FZ.jpg',
      } as WatchProvider;

      const markWatchedPayload = {
        userId: webhookToken.userId,
        tvSeries: tvSeries!,
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
        runtime: episode.runtime,
        watchProvider,
      };

      await markWatched(markWatchedPayload);

      return Response.json({ message: 'OK' });
    } catch (error) {
      console.error('Failed to process Plex scrobble:', error);

      return Response.json(
        { error: 'Failed to process Plex scrobble' },
        { status: 500 },
      );
    }
  }

  return Response.json({ error: 'Invalid provider' }, { status: 400 });
}
